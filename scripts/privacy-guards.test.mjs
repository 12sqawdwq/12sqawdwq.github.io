import assert from "node:assert/strict";
import test from "node:test";
import { findPrivateIPv4 } from "./privacy-guards.mjs";

const blocked = [
  "10.0.0.0",
  "10.0.0.1",
  "10.255.255.255",
  "172.16.0.0",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.0.0",
  "192.168.0.1",
  "192.168.255.255",
];

for (const address of blocked) {
  test(`blocks private address ${address}`, () => {
    assert.deepEqual(findPrivateIPv4(`address: ${address}`), [address]);
    assert.deepEqual(findPrivateIPv4(`<a href="http://${address}:8080/">host</a>`), [address]);
    assert.deepEqual(findPrivateIPv4(`${address}/24`), [address]);
    assert.deepEqual(findPrivateIPv4(`Connect to ${address}.`), [address]);
    assert.deepEqual(findPrivateIPv4(`...${address}...`), [address]);
    assert.deepEqual(findPrivateIPv4(`(${address}),`), [address]);
    assert.deepEqual(findPrivateIPv4(`::ffff:${address}`), [address]);
  });
}

const allowed = [
  "<h2>10. 官网与文档入口</h2>",
  "<li>10. Read the documentation</li>",
  "A measured value of 10.5 V",
  "192.168 is an incomplete dotted sequence",
  "172.16 is not a complete address",
  "203.0.113.9",
  "172.15.255.255",
  "172.32.0.0",
  "192.167.255.255",
  "192.169.0.0",
  "10.256.0.1",
  "10.0.0.999",
  "10.1.2.3.4",
  "110.0.0.1",
];

for (const text of allowed) {
  test(`does not flag non-private-address text: ${text}`, () => {
    assert.deepEqual(findPrivateIPv4(text), []);
  });
}

test("collects all private addresses without duplicates", () => {
  assert.deepEqual(
    findPrivateIPv4("10.0.0.1 203.0.113.9 192.168.1.2 10.0.0.1 172.31.0.3"),
    ["10.0.0.1", "192.168.1.2", "172.31.0.3"],
  );
});
