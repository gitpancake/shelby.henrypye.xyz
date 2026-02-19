import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "shelby_session";
const SECRET_SALT = "shelby-4runner-auth";

function getSecret(): string {
    const password = process.env.AUTH_PASSWORD;
    if (!password) throw new Error("AUTH_PASSWORD not set");
    return createHmac("sha256", SECRET_SALT).update(password).digest("hex");
}

export function createSessionToken(): string {
    const secret = getSecret();
    const payload = Date.now().toString();
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
    try {
        const secret = getSecret();
        const [payload, sig] = token.split(".");
        if (!payload || !sig) return false;
        const expected = createHmac("sha256", secret)
            .update(payload)
            .digest("hex");
        return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
        return false;
    }
}

export function verifyCredentials(username: string, password: string): boolean {
    const expectedUser = process.env.AUTH_USERNAME;
    const expectedPass = process.env.AUTH_PASSWORD;
    if (!expectedUser || !expectedPass) return false;

    // Hash both sides so buffers are always the same length
    const userHash = createHmac("sha256", SECRET_SALT)
        .update(username)
        .digest();
    const expectedUserHash = createHmac("sha256", SECRET_SALT)
        .update(expectedUser)
        .digest();
    const passHash = createHmac("sha256", SECRET_SALT)
        .update(password)
        .digest();
    const expectedPassHash = createHmac("sha256", SECRET_SALT)
        .update(expectedPass)
        .digest();

    const userMatch = timingSafeEqual(userHash, expectedUserHash);
    const passMatch = timingSafeEqual(passHash, expectedPassHash);
    return userMatch && passMatch;
}
