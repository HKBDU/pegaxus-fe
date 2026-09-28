import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false } });
after(async () => vite.close());

test("password requirements show the real policy without red typing errors", async () => {
  const { PasswordRequirements } = await vite.ssrLoadModule(
    "/src/features/auth/components/PasswordRequirements.tsx",
  );
  const markup = renderToStaticMarkup(
    React.createElement(PasswordRequirements, { value: "Password" }),
  );

  assert.match(markup, /8–128 characters/);
  assert.match(markup, /One uppercase letter/);
  assert.match(markup, /One lowercase letter/);
  assert.match(markup, /One number/);
  assert.match(markup, /Fair password/);
  assert.doesNotMatch(markup, /text-red/);
});

test("matching confirmation gets positive feedback", async () => {
  const { PasswordMatchHint } = await vite.ssrLoadModule(
    "/src/features/auth/components/PasswordRequirements.tsx",
  );
  const match = renderToStaticMarkup(
    React.createElement(PasswordMatchHint, {
      password: "Password1",
      confirmation: "Password1",
    }),
  );
  const incomplete = renderToStaticMarkup(
    React.createElement(PasswordMatchHint, {
      password: "Password1",
      confirmation: "Pass",
    }),
  );

  assert.match(match, /Passwords match/);
  assert.doesNotMatch(incomplete, /Passwords match/);
});

test("register, reset, and change password all expose the shared requirements", async () => {
  const [{ default: RegisterPage }, { default: ResetPasswordPage }, { ChangePasswordForm }] = await Promise.all([
    vite.ssrLoadModule("/src/features/auth/pages/RegisterPage.tsx"),
    vite.ssrLoadModule("/src/features/auth/pages/ResetPasswordPage.tsx"),
    vite.ssrLoadModule("/src/features/auth/components/ChangePasswordForm.tsx"),
  ]);
  const renderPage = (component, entry = "/") => renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      React.createElement(MemoryRouter, { initialEntries: [entry] }, component),
    ),
  );

  assert.match(renderPage(React.createElement(RegisterPage)), /Password requirements/);
  assert.match(
    renderPage(
      React.createElement(ResetPasswordPage),
      { pathname: "/reset-password", state: { email: "test@example.com", otp: "123456" } },
    ),
    /Password requirements/,
  );
  assert.match(
    renderPage(React.createElement(ChangePasswordForm, { onSuccess: () => {} })),
    /Password requirements/,
  );
});
