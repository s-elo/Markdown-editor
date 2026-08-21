/* eslint-disable @typescript-eslint/no-magic-numbers */

import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

export interface OAuthRelayConfig {
	allowedRedirectOrigins: string;
	appSlug: string;
	clientId: string;
	stateSecret: string;
}

interface OAuthState extends JWTPayload {
	clientState: string;
	returnTo: string;
}

const REDIRECT_CODE = 302;
const textEncoder = new TextEncoder();

async function createOAuthState(returnTo: string, clientState: string, secret: string): Promise<string> {
	return new SignJWT({ clientState, returnTo } satisfies OAuthState)
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuedAt()
		.setExpirationTime('10m')
		.setJti(crypto.randomUUID())
		.sign(textEncoder.encode(secret));
}

function isOAuthState(value: unknown): value is OAuthState {
	return (
		typeof value === 'object' &&
		value !== null &&
		'clientState' in value &&
		typeof value.clientState === 'string' &&
		'exp' in value &&
		typeof value.exp === 'number' &&
		'jti' in value &&
		typeof value.jti === 'string' &&
		'returnTo' in value &&
		typeof value.returnTo === 'string'
	);
}

async function readOAuthState(value: string, secret: string): Promise<OAuthState | null> {
	try {
		const { payload } = await jwtVerify(value, textEncoder.encode(secret), { algorithms: ['HS256'] });
		return isOAuthState(payload) ? payload : null;
	} catch {
		return null;
	}
}

function getAllowedReturnUrl(value: string, allowedOrigins: string): URL | null {
	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return null;
		}

		const isAllowed = allowedOrigins
			.split(',')
			.map((origin) => origin.trim())
			.filter(Boolean)
			.some((origin) => new URL(origin).origin === url.origin);
		return isAllowed ? url : null;
	} catch {
		return null;
	}
}

export function getOAuthCallbackUrl(requestUrl: URL): string {
	return `${requestUrl.origin}${requestUrl.pathname}`;
}

export async function startGitHubAuth(requestUrl: URL, config: OAuthRelayConfig): Promise<Response> {
	const returnToValue = requestUrl.searchParams.get('return_to');
	const clientState = requestUrl.searchParams.get('client_state');
	if (!returnToValue || !clientState) {
		return new Response('A return URL and client state are required.', { status: 400 });
	}

	const returnTo = getAllowedReturnUrl(returnToValue, config.allowedRedirectOrigins);
	if (!returnTo) {
		return new Response('The return URL is not allowed.', { status: 400 });
	}

	const state = await createOAuthState(returnTo.toString(), clientState, config.stateSecret);
	if (requestUrl.searchParams.get('flow') === 'login') {
		const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
		authorizeUrl.searchParams.set('client_id', config.clientId);
		authorizeUrl.searchParams.set('redirect_uri', getOAuthCallbackUrl(requestUrl));
		authorizeUrl.searchParams.set('prompt', 'select_account');
		authorizeUrl.searchParams.set('state', state);
		return Response.redirect(authorizeUrl.toString(), REDIRECT_CODE);
	}

	const installationUrl = new URL(`https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new`);
	installationUrl.searchParams.set('state', state);
	return Response.redirect(installationUrl.toString(), REDIRECT_CODE);
}

export async function completeGitHubOAuthRedirect(requestUrl: URL, config: OAuthRelayConfig): Promise<Response> {
	const stateValue = requestUrl.searchParams.get('state');
	const state = stateValue ? await readOAuthState(stateValue, config.stateSecret) : null;
	if (!state) {
		return new Response('The OAuth state is missing, invalid, or expired.', { status: 400 });
	}

	const returnTo = getAllowedReturnUrl(state.returnTo, config.allowedRedirectOrigins);
	if (!returnTo) {
		return new Response('The return URL is not allowed.', { status: 400 });
	}

	for (const parameter of ['code', 'error', 'error_description']) {
		const value = requestUrl.searchParams.get(parameter);
		if (value) {
			returnTo.searchParams.set(parameter, value);
		}
	}
	returnTo.searchParams.set('state', state.clientState);
	return Response.redirect(returnTo.toString(), REDIRECT_CODE);
}
