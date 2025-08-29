import Image from 'next/image';
import Link from "next/link";
import { Bruno_Ace_SC } from "next/font/google";
const bruno = Bruno_Ace_SC({ weight: "400", subsets: ["latin"] });

import { Command } from "lucide-react";

// import { RegisterForm } from "../../_components/register-form";
// import { GoogleButton } from "../../_components/social-auth/google-button";

export default function RegisterV1() {
  return (
    <div className="flex h-dvh">
      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="text-2xl font-bold tracking-tight">Register</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Create an Account to get started.
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted p-4 text-center text-sm text-muted-foreground">
              You cannot self register at this time, please contact customer support for assistance.
            </div>
            <p className="text-muted-foreground text-center text-xs">
              Already have an account?{" "}
              <Link href="login" className="text-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-2">
            <Image
              src="/logo-blk.png"
              width={90}
              height={90}
              alt="Logo"
              className="mx-auto"
            />
            <div className="space-y-2">
              <h1 className={`text-primary-foreground text-5xl font-light ${bruno.className}`}>PlotPoint</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
