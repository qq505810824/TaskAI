import crypto from "node:crypto";

const VERSION = "001";
const APP_ID_LENGTH = 24;

export const RTCPrivileges = {
    PublishStream: 0,
    PublishAudioStream: 1,
    PublishVideoStream: 2,
    PublishDataStream: 3,
    SubscribeStream: 4,
} as const;

class ByteWriter {
    private readonly chunks: Buffer[] = [];

    putUint16(value: number) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(value);
        this.chunks.push(buffer);
    }

    putUint32(value: number) {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(value);
        this.chunks.push(buffer);
    }

    putBytes(value: Buffer) {
        this.putUint16(value.length);
        this.chunks.push(value);
    }

    putString(value: string) {
        this.putBytes(Buffer.from(value));
    }

    putPrivilegeMap(map: Record<number, number>) {
        this.putUint16(Object.keys(map).length);

        for (const [key, value] of Object.entries(map)) {
            this.putUint16(Number(key));
            this.putUint32(value);
        }
    }

    toBuffer() {
        return Buffer.concat(this.chunks);
    }
}

export class RTCAccessToken {
    private readonly issuedAt = Math.floor(Date.now() / 1000);
    private readonly nonce = crypto.randomInt(0, 0xffffffff);
    private expireAt = 0;
    private readonly privileges: Record<number, number> = {};

    constructor(
        private readonly appId: string,
        private readonly appKey: string,
        private readonly roomId: string,
        private readonly userId: string
    ) {}

    addPrivilege(privilege: number, expireTimestamp: number) {
        this.privileges[privilege] = expireTimestamp;

        if (privilege === RTCPrivileges.PublishStream) {
            this.privileges[RTCPrivileges.PublishAudioStream] = expireTimestamp;
            this.privileges[RTCPrivileges.PublishVideoStream] = expireTimestamp;
            this.privileges[RTCPrivileges.PublishDataStream] = expireTimestamp;
        }
    }

    expireTime(expireTimestamp: number) {
        this.expireAt = expireTimestamp;
    }

    private packMessage() {
        const writer = new ByteWriter();
        writer.putUint32(this.nonce);
        writer.putUint32(this.issuedAt);
        writer.putUint32(this.expireAt);
        writer.putString(this.roomId);
        writer.putString(this.userId);
        writer.putPrivilegeMap(this.privileges);
        return writer.toBuffer();
    }

    serialize() {
        const message = this.packMessage();
        const signature = crypto.createHmac("sha256", this.appKey).update(message).digest();

        const contentWriter = new ByteWriter();
        contentWriter.putBytes(message);
        contentWriter.putBytes(signature);

        return `${VERSION}${this.appId}${contentWriter.toBuffer().toString("base64")}`;
    }
}

export function createRTCToken(params: {
    appId: string;
    appKey: string;
    roomId: string;
    userId: string;
    expireSeconds?: number;
}) {
    const { appId, appKey, roomId, userId, expireSeconds = 24 * 3600 } = params;

    if (appId.length !== APP_ID_LENGTH) {
        throw new Error("RTC_APP_ID is invalid.");
    }

    const token = new RTCAccessToken(appId, appKey, roomId, userId);
    const expiresAt = Math.floor(Date.now() / 1000) + expireSeconds;

    token.addPrivilege(RTCPrivileges.PublishStream, 0);
    token.addPrivilege(RTCPrivileges.SubscribeStream, 0);
    token.expireTime(expiresAt);

    return token.serialize();
}

