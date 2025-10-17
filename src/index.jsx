import React from "react";
import { createRoot } from "react-dom/client";
import Player from "./components/Player"; // adjust the path if needed
import "./assets/styles.css";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(<Player />);