// picks a uniformly random `bytes32` using JS Math.random state
// (i.e., not itself seeded by `safe-random.js`)
export default function randomSeed() {
  let nibbles = Array(64)
    .fill()
    .map(() => Math.floor(Math.random() * 16).toString(16));
  return "0x" + nibbles.join("");
}
