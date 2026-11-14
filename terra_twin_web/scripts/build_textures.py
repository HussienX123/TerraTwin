"""Build registered, bundled textures. Network access is restricted to NASA hosts."""
from pathlib import Path
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlparse, urlencode
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json, math, hashlib, xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"public/data/terrain"
CACHE=ROOT/"cache/textures"
NS={"w":"http://www.opengis.net/wmts/1.0","o":"http://www.opengis.net/ows/1.1"}
ALLOWED={"gibs.earthdata.nasa.gov","trek.nasa.gov"}
class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if urlparse(newurl).hostname not in ALLOWED: raise ValueError("Service redirects outside permitted hosts")
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def download(url):
    if urlparse(url).hostname not in ALLOWED: raise ValueError("Host outside build allowlist")
    CACHE.mkdir(parents=True,exist_ok=True)
    path=CACHE/(hashlib.sha256(url.encode()).hexdigest()+".cache")
    if not path.exists():
        with build_opener(SafeRedirect()).open(Request(url,headers={"User-Agent":"TerraTwin texture exporter"}),timeout=18) as r:
            payload=r.read()
        path.write_bytes(payload)
    return path.read_bytes()
def capabilities(url):
    return ET.fromstring(download(url))
def layer_info(root,identifier=None):
    layers=root.findall(".//w:Layer",NS)
    layer=next((l for l in layers if l.findtext("o:Identifier",namespaces=NS)==identifier),layers[0])
    name=layer.findtext("o:Identifier",namespaces=NS)
    matrix_name=layer.findtext("w:TileMatrixSetLink/w:TileMatrixSet",namespaces=NS)
    matrix=next(m for m in root.findall(".//w:Contents/w:TileMatrixSet",NS) if m.findtext("o:Identifier",namespaces=NS)==matrix_name)
    templates=[r.attrib["template"] for r in layer.findall("w:ResourceURL",NS) if r.attrib.get("resourceType")=="tile"]
    return layer,name,matrix_name,matrix,templates[0]
def grid(site,n):
    offsets=np.linspace(-30000,30000,n)
    if site["type"]=="earth":
        pixel_m=156543.03392*math.cos(math.radians(site["lat"]))/256
        cx=(site["lon"]+180)/360*65536
        cy=(1-math.asinh(math.tan(math.radians(site["lat"])))/math.pi)/2*65536
        x,y=np.meshgrid(cx+offsets/pixel_m,cy+offsets/pixel_m)
        lon=x/65536*360-180
        lat=np.degrees(np.arctan(np.sinh(math.pi*(1-2*y/65536))))
    else:
        lon,lat=np.meshgrid(site["lon"]+np.degrees(offsets/(3389500*math.cos(math.radians(site["lat"])))),site["lat"]-np.degrees(offsets/3389500))
    return lat,lon
def sample_image(array,x,y):
    x=np.clip(x,0,array.shape[1]-1);y=np.clip(y,0,array.shape[0]-1)
    xi=np.floor(x).astype(int);yi=np.floor(y).astype(int)
    xj=np.minimum(xi+1,array.shape[1]-1);yj=np.minimum(yi+1,array.shape[0]-1)
    dx=(x-xi)[...,None];dy=(y-yi)[...,None]
    return (array[yi,xi]*(1-dx)*(1-dy)+array[yi,xj]*dx*(1-dy)+array[yj,xi]*(1-dx)*dy+array[yj,xj]*dx*dy).astype("uint8")
def stitch(site,info,date,level,trek_base=None):
    layer,name,matrix_name,matrix,template=info
    m=next(m for m in matrix.findall("w:TileMatrix",NS) if m.findtext("o:Identifier",namespaces=NS)==str(level))
    tw=int(m.findtext("w:TileWidth",namespaces=NS));th=int(m.findtext("w:TileHeight",namespaces=NS))
    mw=int(float(m.findtext("w:MatrixWidth",namespaces=NS)));mh=int(float(m.findtext("w:MatrixHeight",namespaces=NS)))
    lat,lon=grid(site,2048)
    if site["type"]=="earth":
        x=(lon+180)/360*mw*tw-.5
        y=(1-np.arcsinh(np.tan(np.radians(lat)))/math.pi)/2*mh*th-.5
        resolution=40075016.68557849/(mw*tw)*math.cos(math.radians(site["lat"]))
    else:
        x=(lon+180)/360*mw*tw-.5;y=(90-lat)/180*mh*th-.5
        resolution=math.pi*2*3389500/(mw*tw)*math.cos(math.radians(site["lat"]))
    left,top=math.floor(x.min()/tw),math.floor(y.min()/th)
    right,bottom=math.floor(x.max()/tw),math.floor(y.max()/th)
    mosaic=np.zeros(((bottom-top+1)*th,(right-left+1)*tw,3),dtype="uint8")
    def tile(coords):
        col,row=coords
        url=template
        if urlparse(url).hostname not in ALLOWED:
            if not trek_base: raise ValueError("Tile service advertises an unapproved external host")
            url=trek_base+"/default/"+matrix_name+"/{TileMatrix}/{TileRow}/{TileCol}.png"
        for key,value in {"Style":"default","Time":date,"TileMatrixSet":matrix_name,"TileMatrix":level,"TileRow":row,"TileCol":col}.items(): url=url.replace("{"+key+"}",str(value))
        url=url.replace("/1.0.0//","/1.0.0/")
        image=np.asarray(Image.open(BytesIO(download(url))).convert("RGB"))
        if image.shape[:2]!=(th,tw): raise ValueError("Unexpected tile dimensions")
        if np.all(image.max(axis=2)<8): raise ValueError("Tile has no imagery")
        return col,row,image
    coords=[(c,r) for r in range(top,bottom+1) for c in range(left,right+1)]
    with ThreadPoolExecutor(max_workers=8) as pool:
        for col,row,image in pool.map(tile,coords):
            mosaic[(row-top)*th:(row-top+1)*th,(col-left)*tw:(col-left+1)*tw]=image
    texture=sample_image(mosaic,x-left*tw,y-top*th)
    if site["type"]=="mars": Image.fromarray(texture).resize((512,512)).save(CACHE/"mars-preview.jpg")
    missing=(texture.max(axis=2)<8).mean()
    bright=(texture.min(axis=2)>225).mean()
    if site["type"]=="earth" and missing>.015: raise ValueError(f"Missing imagery across {missing:.1%} of window")
    if site["type"]=="earth" and bright>.04: raise ValueError("Bright cloud/snow coverage requires another imagery option")
    title=layer.findtext("o:Title",namespaces=NS) or name
    return Image.fromarray(texture),dict(texture_layer=name,texture_source=title,texture_date=date or "Undated composite",texture_resolution_m=463 if "MOLA" in name else round(resolution,3),texture_sampling_m=round(resolution,3))
def save_jpeg(image,path,limit):
    for quality in [90,85,80,75,65,55,45,35]:
        buf=BytesIO();image.save(buf,format="JPEG",quality=quality,optimize=True)
        if buf.tell()<=limit: path.write_bytes(buf.getvalue());return
    raise ValueError("Texture cannot meet file size limit")
def check(site,image):
    h=np.fromfile(OUT/site["file"],dtype="<u2").reshape(site["height"],site["width"]).astype(float)
    h=h/65535*(site["max_m"]-site["min_m"])
    dz,dx=np.gradient(h,site["spacing_m"])
    shade=np.clip((.7-dx*.6-dz*.4)/np.sqrt(1+dx*dx+dz*dz),0,1)
    hill=Image.fromarray((shade*255).astype("uint8")).convert("RGB").resize((512,512))
    proof=Image.new("RGB",(1024,550),"white");proof.paste(hill,(0,38));proof.paste(image.resize((512,512)),(512,38))
    draw=ImageDraw.Draw(proof);draw.text((8,8),site["name"]+" / north up / hillshade",fill="black");draw.text((520,8),"Registered orbital imagery",fill="black")
    proof.save(OUT/("_check_"+site["id"]+".png"))
def main():
    index=json.loads((OUT/"index.json").read_text())
    earth=capabilities("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml")
    ctxurl="https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0"
    try: ctx=layer_info(capabilities(ctxurl+"/WMTSCapabilities.xml"))
    except Exception as error: print("CTX metadata unavailable:",error,flush=True);ctx=None
    for site in index["sites"]:
        choices=[]
        if site["type"]=="earth":
            choices=[(layer_info(earth,"Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual"),"2000-12-01",12,None)]
            choices += [(layer_info(earth,"MODIS_Terra_CorrectedReflectance_TrueColor"),date,9,None) for date in ["2026-11-13","2026-11-10","2026-11-05"]]
            choices += [(layer_info(earth,"BlueMarble_NextGeneration"),"",8,None)]
        else:
            if ctx: choices=[(ctx,"",9,ctxurl)]
            for name in ["Mars_MGS_MOLA_ClrShade_merge_global_463m","Mars_MGS_MOLA_Color_Shade"]:
                try:
                    url="https://trek.nasa.gov/tiles/Mars/EQ/"+name+"/1.0.0"
                    choices.append((layer_info(capabilities(url+"/WMTSCapabilities.xml")),"",7,url))
                    break
                except Exception as error: print("MOLA fallback metadata:",str(error),flush=True)
        success=False
        for info,date,level,trek_base in choices:
            try:
                print("Trying",site["name"],info[1],date,flush=True)
                image,metadata=stitch(site,info,date,level,trek_base)
                if site["type"]=="mars" and "CTX" in info[1]: image=image.convert("L").convert("RGB")
                folder=OUT/site["id"];folder.mkdir(exist_ok=True)
                save_jpeg(image,folder/"tex_2048.jpg",700000)
                save_jpeg(image.resize((1024,1024),Image.Resampling.LANCZOS),folder/"tex_1024.jpg",250000)
                check(site,image)
                lat,lon=grid(site,2)
                corners=[[float(lat[r,c]),float(lon[r,c])] for r,c in [(0,0),(0,1),(1,1),(1,0)]]
                site.update(metadata,texture_status="available",texture_file=site["id"]+"/tex_2048.jpg",texture_file_xr=site["id"]+"/tex_1024.jpg",projection_note="Resampled to the Phase 6 local metric grid, north up; identical geographic corners.",texture_corners=corners)
                print(site["name"],metadata,"heightfield corners =",corners,"texture corners =",corners,"EQUAL",flush=True)
                success=True;break
            except Exception as error: print("Unavailable:",str(error),flush=True)
        if not success: site.update(texture_status="n/a",texture_source="n/a",texture_layer="n/a",texture_date="n/a",texture_resolution_m=None,projection_note="No imagery available from permitted hosts; slope colors used.")
        (OUT/"index.json").write_text(json.dumps(index,indent=2,allow_nan=False))
if __name__=="__main__": main()
