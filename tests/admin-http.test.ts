import { test } from "node:test";
import { request as httpRequest } from "node:http";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { startAdmin } from "../apps/admin/src/server";
import { dataPaths, projectRoot } from "../apps/admin/src/paths";
test("local admin authenticates, rejects hostile requests and preserves product after server restart", async () => {
  const dir = await mkdtemp(path.join(projectRoot, ".test-tmp-http-"));
  const paths = dataPaths(dir);
  let app = await startAdmin({ paths, port: 0, buildUi: false });
  try {
    let origin = app.origin,
      cookie = "",
      csrf = "";
    async function request(
      url: string,
      method = "GET",
      body?: unknown,
      extra: Record<string, string> = {},
    ) {
      return fetch(origin + "/api" + url, {
        method,
        headers: {
          Origin: origin,
          "X-Daya-Request": "1",
          "X-CSRF-Token": csrf,
          "Content-Type": "application/json",
          Cookie: cookie,
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
    assert.equal((await request("/catalogue")).status, 401);
    assert.equal(
      (await request("/products", "POST", { revision: 0 })).status,
      401,
    );
    const hostileHost = await new Promise<number | undefined>(
      (resolve, reject) => {
        const request = httpRequest(
          origin + "/api/catalogue",
          { headers: { Host: "evil.invalid" } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        request.on("error", reject);
        request.end();
      },
    );
    assert.equal(hostileHost, 403);
    const code = (await readFile(app.accessFile, "utf8")).trim();
    assert.equal(
      (
        await request(
          "/login",
          "POST",
          { code },
          { Origin: "https://evil.invalid" },
        )
      ).status,
      403,
    );
    assert.equal(
      (await request("/login", "POST", { code }, { "X-Daya-Request": "" }))
        .status,
      403,
    );
    assert.equal(
      (await request("/login", "POST", { code: "wrong" })).status,
      401,
    );
    async function login() {
      const r = await request("/login", "POST", { code });
      assert.equal(r.status, 200);
      assert(r.headers.get("set-cookie")?.includes("HttpOnly"));
      assert(r.headers.get("set-cookie")?.includes("SameSite=Strict"));
      cookie = r.headers.get("set-cookie")!.split(";")[0];
      csrf = (await r.json()).csrf;
    }
    await login();
    let state = await (await request("/catalogue")).json();
    const endpoint = "/products/" + state.products[0].id;
    assert.equal(
      (
        await request(
          endpoint,
          "PUT",
          { revision: state.revision, product: state.products[0] },
          { "X-CSRF-Token": "wrong" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          endpoint,
          "PUT",
          { revision: state.revision, product: state.products[0] },
          { Origin: "https://evil.invalid" },
        )
      ).status,
      403,
    );
    const changed = structuredClone(state.products[0]);
    changed.content.en.name = "Restart persistence HTTP sample";
    changed.private.notes = "PRIVATE_HTTP_SENTINEL";
    changed.pricePaise = 12345;
    let r = await request(endpoint, "PUT", {
      revision: state.revision,
      product: changed,
    });
    assert.equal(r.status, 200);
    state = (await r.json()).state;
    r = await request(endpoint, "PUT", { revision: 0, product: changed });
    assert.equal(r.status, 409);
    const badId = { ...changed, id: "new-id" };
    assert.equal(
      (
        await request(endpoint, "PUT", {
          revision: state.revision,
          product: badId,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(endpoint, "PUT", {
          revision: state.revision,
          product: { ...changed, isDemo: false },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/categories", "PUT", {
          revision: state.revision,
          categories: state.categories.slice(1),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          "/image?src=" + encodeURIComponent("../../auth/access-code.txt"),
        )
      ).status,
      400,
    );
    assert.equal((await fetch(origin + "/runtime/state.json")).status, 404);
    const image = await sharp({
      create: { width: 100, height: 80, channels: 3, background: "#b38a3f" },
    })
      .png()
      .toBuffer();
    r = await fetch(origin + "/api/images", {
      method: "POST",
      headers: {
        Origin: origin,
        "X-Daya-Request": "1",
        "X-CSRF-Token": csrf,
        Cookie: cookie,
        "Content-Type": "image/png",
        "X-Catalogue-Revision": String(state.revision),
      },
      body: image,
    });
    assert.equal(r.status, 200);
    const uploaded = await r.json();
    state = uploaded.state;
    assert.equal(
      (await request("/image?src=" + encodeURIComponent(uploaded.src))).status,
      200,
    );
    r = await fetch(origin + "/api/images", {
      method: "POST",
      headers: {
        Origin: origin,
        "X-Daya-Request": "1",
        "X-CSRF-Token": csrf,
        Cookie: cookie,
        "Content-Type": "image/png",
        "X-Catalogue-Revision": String(state.revision),
      },
      body: Buffer.from("MZ executable"),
    });
    assert.equal(r.status, 400);
    await app.close();
    app = await startAdmin({ paths, port: 0, buildUi: false });
    origin = app.origin;
    assert.equal((await request("/catalogue")).status, 401);
    await login();
    const restarted = await (await request("/catalogue")).json();
    assert.equal(
      restarted.products[0].content.en.name,
      "Restart persistence HTTP sample",
    );
    assert.equal(restarted.products[0].pricePaise, 12345);
    r = await request("/export", "POST", { revision: restarted.revision });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).products, 24);
    r = await request("/logout", "POST", {});
    assert.equal(r.status, 200);
    assert.equal((await request("/catalogue")).status, 401);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
