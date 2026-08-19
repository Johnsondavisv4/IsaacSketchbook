import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("asset-exporter", "routes/asset-exporter.tsx"),
  route("postit-generator", "routes/postit-generator.tsx"),
  route("mark-exporter", "routes/mark-exporter.tsx"),
  route("progress-manager", "routes/progress-manager.tsx"),
  route("api/settings", "routes/api.settings.ts"),
  route("api/settings/check", "routes/api.settings.check.ts"),
] satisfies RouteConfig;



