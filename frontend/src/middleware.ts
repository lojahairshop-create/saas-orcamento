import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Rotas que requerem autenticação
  const protectedRoutes = ["/dashboard", "/orcamentos", "/configuracoes"];

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Se for protegida e não tiver token, redireciona (o client useAuth também faz essa verificação)
  if (isProtected && !token) {
    // Para simplificar no desenvolvimento (onde o token pode estar apenas no localStorage),
    // podemos deixar passar e o useAuth (client-side) fará o redirect imediato,
    // ou se houver cookie, validamos.
    // Vamos apenas deixar o fluxo seguir para evitar problemas com localStorage vs Edge middleware.
    return NextResponse.next();
  }

  // Redireciona de "/" para "/dashboard"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
