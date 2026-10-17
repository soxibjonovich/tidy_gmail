import createClient from "openapi-fetch"
import type { paths } from "./schema"

const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
})

export { api }
