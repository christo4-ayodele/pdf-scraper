import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
})

export const config = {
  matcher: ["/settings", "/api/upload", "/api/resumes", "/api/checkout", "/api/stripe/create-portal"]
}

