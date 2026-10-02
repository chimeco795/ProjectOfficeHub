export async function api(path: string, options?: RequestInit) {
  const response = await fetch("/api" + path, options);
  const body = await response.json();
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
