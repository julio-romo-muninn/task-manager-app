import { EmailFormatPipe } from './email-format.pipe';

describe('EmailFormatPipe', () => {
  it('create an instance', () => {
    const pipe = new EmailFormatPipe();
    expect(pipe).toBeTruthy();
  });
});
