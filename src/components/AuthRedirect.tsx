"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn && pathname.startsWith("/dashboard")) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
