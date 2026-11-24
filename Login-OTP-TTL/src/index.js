import express from "express";
import Redis from "ioredis";

const app = express();
app.use(express.json());

const redis = new Redis("redis://localhost:6379" || process.env.REDIS_URL);

function otpKey(phoneNumber) {
    return `otp:${phoneNumber}`;
}

app.post("/otp" , async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();// Generate a 6-digit OTP
    await redis.set(otpKey(phoneNumber),otp, "EX", 30);// Set OTP with a TTL of 30 seconds
    res.json({message: `OTP sent to ${phoneNumber}`, otp });
});

app.post("/otp/verify", async (req, res) => {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "Phone number and OTP are required" });
    }
    const savedotp=await redis.get(otpKey(phoneNumber));
    if(!savedotp){
        return res.status(400).json({ error: "OTP has expired or does not exist" });
    }
    if(savedotp !== otp){
        return res.status(400).json({ error: "Invalid OTP" });
    }
    await redis.del(otpKey(phoneNumber));// Delete OTP after successful verification
    res.json({ message: "OTP verified successfully" });
});

app.get("/otp/:phone/ttl", async (req, res) => {
    const { phone } = req.params;
    const ttl = await redis.ttl(otpKey(phone));
    if (ttl === -2) {
        return res.status(404).json({ error: "OTP does not exist" });
    }
    res.json({ ttl });
});

app.listen(3000, () => {
    console.log("Server is running on port http://localhost:3000");
}
);