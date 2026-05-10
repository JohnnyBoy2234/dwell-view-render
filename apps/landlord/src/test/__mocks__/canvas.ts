// Mock for the canvas native module which may not be compiled on all platforms
export default {};
export const createCanvas = () => ({});
export const loadImage = () => Promise.resolve({});
