<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Figma designs
When any message includes a Figma URL, you MUST call `get_design_context` (via the Figma MCP tool) on the specific node before analysing or implementing anything. Do not rely solely on `get_screenshot` or visual inference — `get_design_context` returns exact font families, sizes, colours, spacing, and icon names that are invisible at screenshot resolution. If `get_design_context` requires a node to be selected first, fall back to `get_screenshot` at high `maxDimension` and note the limitation to the user.
