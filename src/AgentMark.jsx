import React from "react";
import "./agent-mark.css";

export function AgentMark({ tone = "iris", size = 30 }) {
  return (
    <span
      aria-hidden="true"
      className={"agent-mark " + tone}
      style={{ "--mark-size": size + "px" }}
    >
      <i />
      <b />
    </span>
  );
}
