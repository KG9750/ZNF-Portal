import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/analytics": "http://localhost:3000",
      "/dashboard": "http://localhost:3000",
      "/device-bookings": "http://localhost:3000",
      "/devices": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/inquiry-records": "http://localhost:3000",
      "/visit-bookings": "http://localhost:3000",
      "/visit-records": "http://localhost:3000",
      "/work-orders": "http://localhost:3000",
      "/zone-bookings": "http://localhost:3000",
      "/zones": "http://localhost:3000"
    }
  }
});
