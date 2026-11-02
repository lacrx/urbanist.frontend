export function repositionYAxis(plot: SVGSVGElement | HTMLElement, marginLeft: number) {
  const tickLabelGroup = plot.querySelector('[aria-label="y-axis tick label"]');
  if (tickLabelGroup) {
    tickLabelGroup.setAttribute("text-anchor", "start");
    tickLabelGroup.setAttribute("transform", `translate(${-marginLeft},0)`);
  }
  const axisLabelGroup = plot.querySelector('[aria-label="y-axis label"]');
  if (axisLabelGroup) {
    const prev = axisLabelGroup.getAttribute("transform") ?? "";
    const yMatch = prev.match(/translate\([^,]+,\s*([^)]+)\)/);
    const y = yMatch ? yMatch[1] : "0";
    axisLabelGroup.setAttribute("transform", `translate(${-marginLeft},${y})`);
  }
}
