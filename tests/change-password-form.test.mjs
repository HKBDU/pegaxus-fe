import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false } });
after(async () => vite.close());

test("change password form exposes the three password fields and dialog actions", async () => {
  const { ChangePasswordForm } = await vite.ssrLoadModule(
    "/src/features/auth/components/ChangePasswordForm.tsx",
  );
  const markup = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(ChangePasswordForm, {
          onSuccess: () => {},
          onCancel: () => {},
        }),
      ),
    ),
  );

  assert.match(markup, /Current password/i);
  assert.match(markup, /New password/i);
  assert.match(markup, /Confirm new password/i);
  assert.equal((markup.match(/type="password"/g) ?? []).length, 3);
  assert.match(markup, />Cancel</);
  assert.match(markup, />Update password</i);
});
