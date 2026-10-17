import { Button } from "@/components/ui/button"
import { GoogleIcon } from "./GoogleIcon"
import { googleSignInUrl } from "../queries"

function GoogleSignInButton() {
  const handleSignIn = () => {
    window.location.assign(googleSignInUrl())
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-2"
      onClick={handleSignIn}
    >
      <GoogleIcon />
      Sign in with Google
    </Button>
  )
}

export { GoogleSignInButton }
