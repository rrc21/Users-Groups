import User from "../models/model"
import Groups from "../models/message-model";
const { ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken");

class Controller {
    constructor(){
    }
    async tologin(req: any, res: any) {

        try {
            const { email, password } = req.body;
            const userlogin: any = await User.findOne({ email: email, password: password }, { password: 0 });
            if ((!userlogin) || (userlogin === null)) {
                res.status(200).json({ code: 401, message: "Invalid username or password" })
            }
                const userd = {
                    user_id: userlogin._id,
                    user_role: userlogin.role,
                    login_user: userlogin.name,
                    email: userlogin.email,
                    password: userlogin.password
                }
                const ACCESS_TOKEN_SECRET: any = process.env.ACCESS_TOKEN_SECRET || "210674"
                const REFRESH_TOKEN_SECRET: any = process.env.REFRESH_TOKEN_SECRET || "210674"
                const accesstoken = jwt.sign(userd, ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
                const refreshtoken = jwt.sign(userd, REFRESH_TOKEN_SECRET, { expiresIn: '1d' });
                const data = {
                    accesstoken,
                    refreshtoken
                }
                const userDetails = { role: userlogin.role, name: userlogin.name, data:userlogin, login_status:true }
                res.status(200).json({ data, code: 200, message: "success", userDetails: userDetails });
            }
        
        catch (error:any) {
            return res.status(400).send("something went wrong")
        }
    }

    async tologout(req: any,res: any){
        try{
            const { id } = req.params
            await User.collection.findOneAndUpdate({_id:ObjectId(id)},{login_status:false});
            return res.status(200).send("Logout successfull")
        }
        catch(err:any){
            return res.status(400).send("Failed to logout")
        }
    }

    async getUsers(req:any,res:any){
        try{
            console.log("getusers")
            const usersData:any=await User.find({})
            res.status(200).send(usersData)
        }
        catch(err){
            console.log("error",err)
            res.status(400).send("please try again")
        }
    }

    async postUser(req: any, res: any) {
        try {
            const token = req.header('auth-token');
            if(verifyAccess(token)){ // only admin can have access to add new user
                console.log("admin ")
                const payload={...req.body,loginstatus:false,groups:[],messages:[]}
                if(Object.values(payload).every((el:any)=>el!=="")){
                    const usersData: any = await User.collection.insertOne(payload);
                    return res.status(200).send({ message: "post user is success", data: usersData });
                }
                return res.status(201).send({ message: "some fields are missing" });
            }
             return res.status(400).send({message:"You dont have access to add new member or you have logout"})            
        } catch (err) {
            console.log("error", err);
            return res.status(400).send("please try again");
        }
    } 

    async createGroup(req:any, res:any) {
        try{
            const { group_name, members }= req.body
            const createStatus:any=await Groups.collection.insertOne({name:group_name,members:members})
            if(createStatus.acknowledged){
               await User.collection.updateMany({_id:{$in:members}},{ $push: { groups: createStatus.insertedId } })
               return res.status(200).send({message:"group is created",data:req.body})
            }
            return res.status(201).send("group cannot be created")
        }
        catch(err: any){
            return res.status(400).send("Something went wrong")
        }
    }

    async deleteGroup(req:any, res:any) {
        try{
            const { id } = req.params
            const deleteStatus:any=await Groups.collection.deleteOne({id:ObjectId(id)})
            if(deleteStatus.acknowledged){
               await User.collection.updateMany({},{ $pull: { groups: id } })
               return res.status(200).send({message:"group is deleted"})
            }
            return res.status(201).send("group cannot be deleted")
        }
        catch(err: any){
            return res.status(400).send("Something went wrong")
        }
    }

    async addMemberToGroup(req:any, res:any){
        try{
            const { group, member } = req.body
            const addtogroup: any= await Groups.collection.findOneAndUpdate({_id:ObjectId(group)},{$push:{groups:member}})
            if(addtogroup){
                await User.collection.findOneAndUpdate({_id:ObjectId(member)},{$push:{groups:group}})
                return res.status(200).send("Added to group")
            }
            return res.status(201).send({message:"Cannot be added into the group"})
        }
        catch(err:any){
            return res.status(400).send("Something went wrong")
        }
    }

    async messageInGroup(req: any,res: any){
        try{
           const { id }= req.params
           const { from , message } = req.body
           const message_payload:any = {from: from,message: message}
           const pushMsg: any = Groups.collection.findOneAndUpdate({_id:ObjectId(id)},{$push:{messages:message_payload}})
           if(pushMsg){
              return res.status(200).send({message:"Message sent",data:pushMsg})
           }
           return res.status(201).send("Message not sent")
        }
        catch(err:any){
            return res.status(400).send("Something went wrong")
        }
    }  

    async getMessagesInGroup(req:any, res: any){
        try{
            const { id }= req.params
            const messages: any=await Groups.collection.findOne({_id:ObjectId(id)})
            console.log("messages",messages)
            return res.status(200).send({"message":"Got group Messages",messages:messages})
        }
        catch(err:any){
            return res.status(400).send({"message":"Something Went Wrong"})
        }
    }
}

function verifyAccess(token:any){
    token = token.split(' ')[1]
    const decodedData: any = jwt.decode(token, { complete: true });
    const decoded = decodedData.payload;
    if(decoded.user_role==='Admin' && decoded.login_status===true ){
        return true;
    }
    return false;
}

const usersController= new Controller()
export default usersController;