import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import DiagnosticLandingApp from "./DiagnosticLandingApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiagnosticLandingApp variant="readiness" />
  </StrictMode>,
);
