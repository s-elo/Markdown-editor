/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/naming-convention */

import { completeGitHubOAuthRedirect, getOAuthCallbackUrl, startGitHubOAuth, type OAuthRelayConfig } from './oauthRelay';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	CLIENT_ID: string;
	CLIENT_SECRET: string;
	ALLOWED_REDIRECT_ORIGINS: string;
}

interface OAuthCodeRequest {
	code: string;
}

interface GitHubAccessTokenSuccess {
	access_token: string;
}

interface GitHubAccessTokenFailure {
	error: string;
	error_description?: string;
	error_uri?: string;
}

type GitHubAccessTokenResponse = GitHubAccessTokenFailure | GitHubAccessTokenSuccess;

function isOAuthCodeRequest(value: unknown): value is OAuthCodeRequest {
	return typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string' && value.code.length > 0;
}

function isGitHubAccessTokenFailure(value: GitHubAccessTokenResponse): value is GitHubAccessTokenFailure {
	return 'error' in value;
}

function getOAuthRelayConfig(env: Env): OAuthRelayConfig {
	return {
		allowedRedirectOrigins: env.ALLOWED_REDIRECT_ORIGINS,
		clientId: env.CLIENT_ID,
		stateSecret: env.CLIENT_SECRET,
	};
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const requestUrl = new URL(request.url);

		// handle CORS pre-flight request
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		// redirect GET requests to the OAuth login page on github.com
		if (request.method === 'GET') {
			const relayConfig = getOAuthRelayConfig(env);
			if (requestUrl.searchParams.has('code') || requestUrl.searchParams.has('error')) {
				return completeGitHubOAuthRedirect(requestUrl, relayConfig);
			}

			return startGitHubOAuth(requestUrl, relayConfig);
		}

		try {
			const body: unknown = await request.json();
			if (!isOAuthCodeRequest(body)) {
				return new Response('A GitHub authorization code is required.', { status: 400 });
			}

			const response = await fetch('https://github.com/login/oauth/access_token', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'user-agent': 'cloudflare-worker-github-oauth-login-demo',
					accept: 'application/json',
				},
				body: JSON.stringify({
					client_id: env.CLIENT_ID,
					client_secret: env.CLIENT_SECRET,
					code: body.code,
					redirect_uri: getOAuthCallbackUrl(requestUrl),
				}),
			});
			const result = (await response.json()) as GitHubAccessTokenResponse;
			const headers = {
				'Access-Control-Allow-Origin': '*',
			};

			if (isGitHubAccessTokenFailure(result)) {
				return new Response(JSON.stringify(result), { status: 401, headers });
			}

			return new Response(JSON.stringify({ token: result.access_token }), {
				status: 201,
				headers,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unexpected error.';
			console.error(error);
			return new Response(message, {
				status: 500,
			});
		}
	},
} satisfies ExportedHandler<Env>;
