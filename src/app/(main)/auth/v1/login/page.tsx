import Image from 'next/image';
import Link from "next/link";
import { Bruno_Ace_SC } from "next/font/google";
const bruno = Bruno_Ace_SC({ weight: "400", subsets: ["latin"] });

import { Command } from "lucide-react";

import { LoginForm } from "../../_components/login-form";
// import { GoogleButton } from "../../_components/social-auth/google-button";

export default function LoginV1() {
  return (
    <div className="flex h-dvh">
      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-2">
            {/* Invert sidebar logic: light → white logo, dark → black logo */}
            <Image
              src="/logo-wht.png"
              width={150}
              height={150}
              alt="Logo"
              className="mx-auto block dark:hidden"
            />
            <Image
              src="/logo-blk.png"
              width={150}
              height={150}
              alt="Logo"
              className="mx-auto hidden dark:block"
            />
            <div className="space-y-2">
              <h1 className={`text-primary-foreground text-5xl font-light ${bruno.className}`}>PlotPoint</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="text-2xl font-bold tracking-tight">Login</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Welcome back. Enter your email and password to access your account.
            </div>
          </div>
          <div className="space-y-4">
            <LoginForm />
            {/* <GoogleButton className="w-full" variant="outline" /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
