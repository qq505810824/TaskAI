export type BinaryPayload = { type: string; value: string };

export function tlvToString(buffer: ArrayBuffer): BinaryPayload {
    const typeBuffer = new Uint8Array(buffer, 0, 4);
    const lengthBuffer = new Uint8Array(buffer, 4, 4);
    const valueBuffer = new Uint8Array(buffer, 8);

    const type = Array.from(typeBuffer)
        .map((value) => String.fromCharCode(value))
        .join("");

    const length = (lengthBuffer[0] << 24) | (lengthBuffer[1] << 16) | (lengthBuffer[2] << 8) | lengthBuffer[3];

    return {
        type,
        value: new TextDecoder().decode(valueBuffer.subarray(0, length)),
    };
}

