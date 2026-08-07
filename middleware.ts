// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(request: NextRequest) {
//   const url = request.nextUrl.clone();

//   // Hit internal API untuk ambil user session
//   const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/me`, {
//     headers: {
//       cookie: request.headers.get('cookie') || '',
//     },
//   });

//   if (!res.ok) {
//     url.pathname = '/login';
//     return NextResponse.redirect(url);
//   }

//   const { user } = await res.json();

//   if (!user || !user.backofficePermissions) {
//     url.pathname = '/login';
//     return NextResponse.redirect(url);
//   }

//   const pathname = url.pathname;

//   // Mapping route ke permission path
//   const permissionMap: Record<string, string> = {
//     //backoffice
//     '/dashboard': 'backofficePermissions.viewDashboard',
//     '/reports/sales/summary': 'backofficePermissions.viewReports.sales',
//     '/reports/transactions': 'backofficePermissions.viewReports.transactions',
//     '/inventory/summary': 'backofficePermissions.viewInventory.summary',
//     '/inventory/supplier': 'backofficePermissions.viewInventory.supplier',
//     '/inventory/purchaseOrder': 'backofficePermissions.viewInventory.purchaseOrder',
//     '/library/bundle_package': 'backofficePermissions.viewLibrary.bundlePackage',
//     '/library/discounts': 'backofficePermissions.viewLibrary.discounts',
//     '/library/taxes': 'backofficePermissions.viewLibrary.taxes',
//     '/library/gratuity': 'backofficePermissions.viewLibrary.gratuity',
//     '/modifiers/modifiersLibrary': 'backofficePermissions.viewModifier.modifiersLibrary',
//     '/modifiers/modifierCategory': 'backofficePermissions.viewModifier.modifierCategory',
//     '/ingredients/ingredientsLibrary': 'backofficePermissions.viewIngredients.ingredientsLibrary',
//     '/ingredients/ingredientCategory': 'backofficePermissions.viewIngredients.ingredientsCategory',
//     '/ingredients/recipes': 'backofficePermissions.viewIngredients.recipes',
//     '/menuNotarich/menuList': 'backofficePermissions.viewMenu.menuList',
//     '/menuNotarich/menuCategory': 'backofficePermissions.viewMenu.menuCategory',
//     '/recapNotarich/stockCafe': 'backofficePermissions.viewRecap.stockCafe',
//     '/recapNotarich/stockInventory': 'backofficePermissions.viewRecap.stockInventory',
//     '/employee/employee_slots': 'backofficePermissions.viewEmployees.employeeSlots',
//     '/employee/employee_access': 'backofficePermissions.viewEmployees.employeeAccess',

//     //app atau cashier
//     '/cashier': 'appPermissions.cashier',
//     '/cashier/menu': 'appPermissions.menu',
//     '/cashier/riwayat': 'appPermissions.riwayat',
//   };

//   const requiredPermission = permissionMap[pathname];

//   if (requiredPermission && !hasPermission(user, requiredPermission)) {
//     url.pathname = '/unauthorized';
//     return NextResponse.redirect(url);
//   }

//   return NextResponse.next();
// }

// // Helper function untuk cek permission nested
// function hasPermission(obj: any, path: string): boolean {
//   const keys = path.split('.');
//   let current = obj;
//   for (const key of keys) {
//     if (current?.[key] === undefined) return false;
//     current = current[key];
//   }
//   return current === true;
// }

// // Tentukan route yang akan di-protect
// export const config = {
//   matcher: [
//     //backoffice
//     '/dashboard',
//     '/reports/:path*',
//     '/inventory/:path*',
//     '/library/:path*',
//     '/modifiers/:path*',
//     '/ingredients/:path*',
//     '/menuNotarich/:path*',
//     '/recapNotarich/:path*',
//     '/employee/:path*',
//     //app atau cashier
//     '/cashier/:path*',
//   ],
// };

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgotPassword', '/resetPassword', '/unauthorized', '/register'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
    img-src 'self' data: https://*.public.blob.vercel-storage.com;
    font-src 'self' data:;
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Public pages: apply CSP only, skip auth/permission check entirely
  if (isPublicPath(pathname)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Hit internal API untuk ambil user session
  const res = await fetch(`${request.nextUrl.origin}/api/auth/me`, {
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
  });

  if (!res.ok) {
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  const { user } = await res.json();

  if (!user || !user.backofficePermissions) {
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  const permissionMap: Record<string, string> = {
    '/dashboard': 'backofficePermissions.viewDashboard',
    '/reports/sales/summary': 'backofficePermissions.viewReports.sales',
    '/reports/transactions': 'backofficePermissions.viewReports.transactions',
    '/inventory/summary': 'backofficePermissions.viewInventory.summary',
    '/inventory/supplier': 'backofficePermissions.viewInventory.supplier',
    '/inventory/purchaseOrder': 'backofficePermissions.viewInventory.purchaseOrder',
    '/library/bundle_package': 'backofficePermissions.viewLibrary.bundlePackage',
    '/library/discounts': 'backofficePermissions.viewLibrary.discounts',
    '/library/taxes': 'backofficePermissions.viewLibrary.taxes',
    '/library/gratuity': 'backofficePermissions.viewLibrary.gratuity',
    '/modifiers/modifiersLibrary': 'backofficePermissions.viewModifier.modifiersLibrary',
    '/modifiers/modifierCategory': 'backofficePermissions.viewModifier.modifierCategory',
    '/ingredients/ingredientsLibrary': 'backofficePermissions.viewIngredients.ingredientsLibrary',
    '/ingredients/ingredientCategory': 'backofficePermissions.viewIngredients.ingredientsCategory',
    '/ingredients/recipes': 'backofficePermissions.viewIngredients.recipes',
    '/menuNotarich/menuList': 'backofficePermissions.viewMenu.menuList',
    '/menuNotarich/menuCategory': 'backofficePermissions.viewMenu.menuCategory',
    '/recapNotarich/stockCafe': 'backofficePermissions.viewRecap.stockCafe',
    '/recapNotarich/stockInventory': 'backofficePermissions.viewRecap.stockInventory',
    '/employee/employee_slots': 'backofficePermissions.viewEmployees.employeeSlots',
    '/employee/employee_access': 'backofficePermissions.viewEmployees.employeeAccess',
    '/cashier': 'appPermissions.cashier',
    '/cashier/menu': 'appPermissions.menu',
    '/cashier/riwayat': 'appPermissions.riwayat',
  };

  const requiredPermission = permissionMap[pathname];

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    url.pathname = '/unauthorized';
    const response = NextResponse.redirect(url);
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

function hasPermission(obj: any, path: string): boolean {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current?.[key] === undefined) return false;
    current = current[key];
  }
  return current === true;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg)$).*)',
  ],
};