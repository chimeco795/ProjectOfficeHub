import {sessionValue,expireSession} from './components/authState';
export async function api(path: string, options?: RequestInit) {
  const headers=new Headers(options?.headers);
  const csrf=sessionValue()?.csrf;
  if(csrf&&options?.method&&!['GET','HEAD'].includes(options.method.toUpperCase()))headers.set('x-pohub-csrf',csrf);
  const response = await fetch("/api" + path, {...options,headers,credentials:'same-origin',cache:'no-store'});
  const body = await response.json();
  if(response.status===401&&path!=='/auth/login'&&csrf&&sessionValue()?.csrf===csrf)expireSession();
  if (!response.ok)
    throw Error(
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail
              .map((item: { msg: string }) =>
                item.msg.replace(/^Value error, /, ""),
              )
              .join(" ")
          : "No se pudo completar la operación.",
    );
  return body;
}
export const json = (body: unknown) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
