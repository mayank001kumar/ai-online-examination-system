const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isOtpValid = (user, otp) => {
  if (!user.otp || !user.otpExpires) return false;
  if (user.otp !== otp) return false;
  if (Date.now() > new Date(user.otpExpires).getTime()) return false;
  return true;
};

module.exports = { generateOtp, isOtpValid };
