const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendRegistrationEmail = async (
  email,
  event
) => {

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Event Registration - ${event.title}`,

    text: `
You have successfully registered for:

Event: ${event.title}
Date: ${event.date}
Time: ${event.time}

Description:
${event.description}
`
  };

  await transporter.sendMail(mailOptions);

};

module.exports = {
  sendRegistrationEmail
};