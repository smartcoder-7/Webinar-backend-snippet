function generateToken(len: number) {
  const possible = `${0xffffffff}`;
  const length = len || 6;

  let text = ``;

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

export { generateToken };
