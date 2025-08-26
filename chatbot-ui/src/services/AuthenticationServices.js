
import { Component } from 'react';
import xhrClient from "../api/xhrClient"


export default new class AuthenticationServices extends Component {
    constructor() {
        super();
    }

    register =  ({ ...data }) => {
        try {
            const response = xhrClient('http://localhost:8022/auth/register', 'POST', {
                'Content-Type': 'application/json',
            }, data);
            return response;
        } catch (e) {
           return e;
        }
    }

    login = async ({ ...data }) => { 
        try {
            const response = xhrClient('http://localhost:8022/auth/login', 'POST', {
                'Content-Type': 'application/json',
            }, data);
            return response;
        } catch (e) {
           return e;
        }
    };
     
//     resetForget = async ({...data})=>{
//         try {
//             const request = await authenticationService.post("/auth/forget-password", JSON.stringify(data), {
//                 headers: { 'Content-Type': 'application/json' },
//             });
//             return request;
//         } catch (error) { 
//             return error;
//         }
//     }

//     verifyRestToken= async(token)=>{
//         try {
//             const request = await authenticationService.get("/auth/reset-password?token="+token, {
//                 headers: { 'Content-Type': 'application/json' },
//             });
//             return request;
//         } catch (error) { 
//             $(".text").text("Submit");
//             $(".error").show().html('<b>Network Error:</b> Please check your network connetion.');
//             return error;
//         }
//     }

//     saveChangePassword= async(data)=>{
//         try {
//             const request = await authenticationService.post("/auth/create-new-password", JSON.stringify(data), {
//                 headers: { 'Content-Type': 'application/json' },
//             });
//             return request;
//         } catch (error) { 
//             $(".text").text("Submit");
//             $(".error").show().html('<b>Network Error:</b> Please check your network connetion.');
//             return error;
//         }
//     }

//     verifyOtpToken = async (token) => {
//          try {
//             const request = await authenticationService.get("/auth/verify-otp-token?token="+token, {
//                 headers: { 'Content-Type': 'application/json' },
//             });
//             return request;
//         } catch (error) { 
//             return error;
//         }
//     }

//     submitOtp = async ({ ...otp }) => {
//         try {
//             const request = await authenticationService.post("/auth/verify-otp", JSON.stringify(otp), {
//                 headers: { 'Content-Type': 'application/json' },
//             });
//             return request;
//         } catch (error) { 
//             return error;
//         }
//     }

}