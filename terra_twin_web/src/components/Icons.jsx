import React from 'react';import Icon from '../icons';
export const AlertIcon=p=><Icon name="info" {...p}/>;
export const MarsIcon=p=><Icon name="compass" {...p}/>;
export const CloseIcon=p=><Icon name="close" {...p}/>;
export const CopyIcon=p=><Icon name="copy" {...p}/>;
export const SlidersIcon=p=><Icon name="sliders" {...p}/>;
export const CompassIcon=p=><Icon name="compass" {...p}/>;
export const ChevronIcon=({open,...p})=><Icon name="chevron" style={{transform:open?'rotate(90deg)':undefined}} {...p}/>;