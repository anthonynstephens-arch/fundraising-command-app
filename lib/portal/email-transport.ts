import nodemailer from 'nodemailer'
export function emailConfigured(){return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD)}
export function emailTransport(){
 if(!emailConfigured())throw Error('Email delivery is not configured.')
 const port=Number(process.env.SMTP_PORT||465)
 return nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:process.env.SMTP_SECURE==='true'||port===465,requireTLS:port!==465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:7000,greetingTimeout:7000,socketTimeout:10000})
}
export function emailSender(){return {from:{name:process.env.NOTIFICATION_FROM_NAME||'Fundraiser Command',address:process.env.NOTIFICATION_FROM_EMAIL||process.env.SMTP_USER!},replyTo:process.env.NOTIFICATION_REPLY_TO}}
