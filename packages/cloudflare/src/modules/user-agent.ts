import parseua from "ua-parser-js";
import { headers } from "./request";

export type DeviceType =
	| "console"
	| "mobile"
	| "tablet"
	| "smarttv"
	| "wearable"
	| "embedded"
	| "desktop"
	| ({} & string);

export type Architecture =
	| "68k"
	| "amd64"
	| "arm"
	| "arm64"
	| "armhf"
	| "avr"
	| "ia32"
	| "ia64"
	| "irix"
	| "irix64"
	| "mips"
	| "mips64"
	| "pa-risc"
	| "ppc"
	| "sparc"
	| "sparc64"
	| ({} & string);

/**
 * An object containing information about the device used in the request.
 */
export interface Device {
	/**
	 *  A string representing the type of the device, such as `console`, `mobile`,
	 *  `tablet`, `smarttv`, `wearable`, `embedded`, or `undefined`.
	 */
	type: DeviceType | undefined;
	/**
	 *  A string representing the model of the device, or `undefined`.
	 */
	model: string | undefined;
	/**
	 *  A string representing the vendor of the device, or undefined.
	 */
	vendor: string | undefined;
}

/**
 * An object containing information about the browser used in the request.
 */
export interface Browser {
	/**
	 *  A string representing the browser's name, or `undefined` if not identifiable.
	 */
	name: string | undefined;
	/**
	 * A string representing the browser's version, or `undefined`.
	 */
	version: string | undefined;
}

/**
 * An object containing information about the CPU architecture.
 */
export interface CPU {
	/**
	 * A string representing the architecture of the CPU. Possible values include:
	 * `68k`, `amd64`, `arm`, `arm64`, `armhf`, `avr`, `ia32`, `ia64`, `irix`,
	 * `irix64`, `mips`, `mips64`, `pa-risc`, `ppc`, `sparc`, `sparc64` or `undefined`
	 */
	architecture: Architecture | undefined;
}

/**
 * An object containing information about the browser's engine.
 */
export interface Engine {
	/**
	 * A string representing the engine's name. Possible values include: `Amaya`,
	 * `Blink`, `EdgeHTML`, `Flow`, `Gecko`, `Goanna`, `iCab`, `KHTML`, `Links`,
	 * `Lynx`, `NetFront`, `NetSurf`, `Presto`, `Tasman`, `Trident`, `w3m`,
	 * `WebKit` or `undefined`
	 */
	name: string | undefined;
	/**
	 * A string representing the engine's version, or `undefined`.
	 */
	version: string | undefined;
}

/**
 * An object containing information about the operating system.
 */
export interface OS {
	/**
	 * A string representing the name of the OS, or `undefined`
	 */
	name: string | undefined;
	/**
	 * A string representing the version of the OS, or undefined
	 */
	version: string | undefined;
}

export interface UserAgent {
	/**
	 * A boolean indicating whether the request comes from a known bot.
	 */
	isBot: boolean;
	/**
	 * An object containing information about the device used in the request.
	 */
	device: Device;
	/**
	 * An object containing information about the browser used in the request.
	 */
	browser: Browser;
	/**
	 * An object containing information about the browser's engine.
	 */
	engine: Engine;
	/**
	 * An object containing information about the operating system.
	 */
	os: OS;
	/**
	 * An object containing information about the CPU architecture.
	 */
	cpu: CPU;
}

/**
 * @param {string} input
 * @returns {boolean}
 */
export function isBot(input: string): boolean {
	return /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Storebot-Google|Google-PageRenderer|Google-InspectionTool|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|LinkedInBot|bitlybot|tumblr|vkShare|quora link preview|facebookexternalhit|facebookcatalog|Twitterbot|applebot|redditbot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|ia_archiver/i.test(
		input
	);
}

/**
 * @returns {UserAgent}
 */
export function userAgent(): UserAgent {
	const ua = headers().get("user-agent") || undefined;
	return {
		...parseua(ua),
		isBot: ua === undefined ? false : isBot(ua),
	};
}
