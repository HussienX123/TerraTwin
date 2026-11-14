import {SelectionProvider} from './Selection';
import React from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/brand.css";
import {PlayProvider} from './play/PlayState';
import App from "./App";

if (location.pathname === '/terrain') {
  const url = new URL(location.href);
  url.pathname = '/'; url.searchParams.set('view', 'globe'); url.searchParams.set('terrain', '1');
  location.replace(url.href);
} else createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SelectionProvider><PlayProvider><App /></PlayProvider></SelectionProvider>
  </React.StrictMode>
);
