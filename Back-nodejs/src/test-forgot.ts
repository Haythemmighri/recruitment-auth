import { authService } from './modules/auth/auth.service';

async function testForgot() {
  console.log('Testing forgot password...');
  const res = await authService.forgotPassword('nour.mighri000@gmail.com');
  console.log(res);
}

testForgot()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
