const pool = require("../config/db");

const storeOtp = async (userId, otp) => {
  const query = `
    INSERT INTO otps (user_id, otp_hash, expires_at)
    VALUES ($1, crypt($2, gen_salt('bf')), NOW() + INTERVAL '10 minutes')
  `;
  await pool.query(query, [userId, otp]);
};

const verifyOtp = async (userId, otp) => {
  const query = `
    SELECT * FROM otps WHERE user_id = $1 AND otp_hash = crypt($2, otp_hash) AND expires_at > NOW()
  `;
  const result = await pool.query(query, [userId, otp]);
  return result.rows.length > 0;
};

module.exports = { storeOtp, verifyOtp };
