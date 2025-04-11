const express = require('express');
const {ApolloServer, gql} = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const {ApolloServerPluginLandingPageGraphQLPlayground} = require('apollo-server-core');
const axios = require('axios');

const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const {Schema, model} = mongoose;

mongoose.connect('mongodb://localhost:27017/community-engagement-microservice', {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// User schema for local reference
const userSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        required: true
    },
    username: {
        type: String,
        required: true
    }
});

const User = model('User', userSchema);

// community post schema
const communityPostSchema = new Schema({
    author:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title:{
        type: String,
        required: true
    },
    content:{
        type: String,
        required: true
    },
    category:{
        type: String,
        required: true
    },
    aiSummary: String,
    createdAt:{
        type: Date,
        default: Date.now
    },
    updateAt: Date,
});

const CommunityPost = model('CommunityPost', communityPostSchema); 

//help request schema
const helpRequestSchema = new Schema({
    author:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description:{
        type: String,
        required: true
    },
    location: String,
    isResolved:{
        type: Boolean,
        default: false
    },
    volunteers:[{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt:{
        type: Date,
        default: Date.now
    },
    updateAt: Date,
});
const HelpRequest = model('HelpRequest', helpRequestSchema);

const typeDefs = gql`
    type User{
        id: ID!
        username: String!
    }
type communityPost{
    id: ID!
    author: User!
    title: String!
    content: String!
    category: String!
    aiSummary: String
    createdAt: String
    updateAt: String
}
    type helpRequest{
        id: ID!
        author: User!
        description: String!
        location: String
        isResolved: Boolean
        volunteers: [User]
        createdAt: String
        updateAt: String
    }

    type Query{
        communityPosts: [communityPost]
        helpRequests: [helpRequest]
        users: [User]
    }
    type Mutation{
        createCommunityPost(author: ID!, title: String!, 
        content: String!, 
        category: String!, 
        aiSummary: String): communityPost

        createHelpRequest(author: ID!, 
        description: String!, 
        location: String, 
        isResolved: Boolean, 
        volunteers: [ID!]): helpRequest

        deleteCommunityPost(id: ID!): communityPost
        deleteHelpRequest(id: ID!): helpRequest
        resolveHelpRequest(id: ID!): Boolean
        updateCommunityPost(id: ID!, title: String, content: String, category: String, aiSummary: String): communityPost
        updateHelpRequest(id: ID!, description: String, location: String, isResolved: Boolean, volunteers: [ID!]): helpRequest
    }
`;

// Helper function to fetch and sync user data
// Modify the syncUserData function
async function syncUserData(userId, token) {
    try {
        // Check if user exists in our local DB with proper ObjectId conversion
        const objectId = mongoose.Types.ObjectId.isValid(userId) ? 
            new mongoose.Types.ObjectId(userId) : null;
            
        const existingUser = objectId ? await User.findById(objectId) : null;
        if (existingUser) return existingUser;
        
        // If not, fetch user data from auth service
        const response = await axios.post('http://localhost:4001/graphql', {
            query: `
                query {
                    users {
                        id
                        username
                    }
                }
            `
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${token}`
            }
        });

        const users = response.data.data.users;
        const userData = users.find(u => u.id === userId);
        
        if (userData) {
            // Create user in our local DB with proper ObjectId
            const newUser = await User.create({
                _id: new mongoose.Types.ObjectId(userId),
                username: userData.username
            });
            return newUser;
        }
        
        // Fallback with valid ObjectId
        const generatedId = userId && mongoose.Types.ObjectId.isValid(userId) ? 
            new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId();
            
        // Use a safe default username
        const defaultUsername = `User-${generatedId.toString().substring(0, 5)}`;
        
        const newUser = await User.create({
            _id: generatedId,
            username: defaultUsername
        });
        
        return newUser;
    } catch (error) {
        console.error('Error in syncUserData:', error);
        // Create a fallback user with valid ObjectId
        const generatedId = new mongoose.Types.ObjectId();
        const newUser = await User.create({
            _id: generatedId,
            username: `User-${generatedId.toString().substring(0, 5)}`
        });
        return newUser;
    }
}

const resolvers = {
    Query: {
        communityPosts: async(_, __, {user, token}) => {
            if(!user) throw new Error('You are not authenticated');
            
            try {
                // Get all posts
                const posts = await CommunityPost.find();
                
                // Process each post to ensure author data is properly handled
                const populatedPosts = [];
                
                for (const post of posts) {
                    // Convert to plain object for easier manipulation
                    const plainPost = post.toObject();
                    
                    // Ensure the post ID is a string
                    plainPost.id = plainPost._id.toString();
                    
                    // Convert dates to ISO strings
                    if (plainPost.createdAt) {
                        plainPost.createdAt = plainPost.createdAt.toISOString();
                    }
                    
                    if (plainPost.updateAt) {
                        plainPost.updateAt = plainPost.updateAt.toISOString();
                    }
                    
                    // Get author information
                    try {
                        const authorId = plainPost.author;
                        // Sync user data to ensure we have current information
                        const authorData = await syncUserData(authorId.toString(), token);
                        
                        // Set properly formatted author data
                        plainPost.author = {
                            id: authorData._id.toString(),
                            username: authorData.username
                        };
                    } catch (error) {
                        console.error('Error getting author data:', error);
                        // Fallback author
                        plainPost.author = {
                            id: 'unknown',
                            username: 'Unknown User'
                        };
                    }
                    
                    populatedPosts.push(plainPost);
                }
                
                return populatedPosts;
            } catch (error) {
                console.error('Error in communityPosts resolver:', error);
                throw new Error('Failed to fetch community posts');
            }
        },
        helpRequests: async(_, __, {user, token}) => {
            if(!user) throw new Error('You are not authenticated');
            
            // Populate requests with author and volunteers data
            const requests = await HelpRequest.find().populate('author volunteers');
            
            // Ensure all requests have valid author data
            for (const request of requests) {
                if (!request.author || !request.author.username) {
                    // If author is missing, sync with auth service
                    const userData = await syncUserData(request.author, token);
                    request.author = userData;
                }
                
                // Also check volunteers
                if (request.volunteers && request.volunteers.length > 0) {
                    for (let i = 0; i < request.volunteers.length; i++) {
                        if (!request.volunteers[i] || !request.volunteers[i].username) {
                            const userData = await syncUserData(request.volunteers[i], token);
                            request.volunteers[i] = userData;
                        }
                    }
                }
            }
            
            return requests;
        },
        users: async(_, __, {user, token}) => {
            if(!user) throw new Error('You are not authenticated');
            
            try {
                // Fetch users from auth service
                const response = await axios.post('http://localhost:4001/graphql', {
                    query: `
                        query {
                            users {
                                id
                                username
                            }
                        }
                    `
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': `token=${token}`
                    }
                });
                
                return response.data.data.users;
            } catch (error) {
                console.error('Error fetching users:', error);
                // Fallback to local users
                const users = await User.find();
                return users.map(u => ({
                    id: u._id.toString(),
                    username: u.username
                }));
            }
        },
    },
    Mutation:{
        createCommunityPost: async(_, {author, title, content, category, aiSummary}, {user, token}) => {
            if(!user) throw new Error('You are not authenticated');
            
            try {
                // Convert author ID to a valid ObjectId
                let authorId;
                if (author && mongoose.Types.ObjectId.isValid(author)) {
                    authorId = new mongoose.Types.ObjectId(author);
                    
                    // Ensure author exists in local DB
                    const authorData = await syncUserData(author, token);
                    // If we have different author data, use the synced version
                    if (authorData && authorData._id) {
                        authorId = authorData._id;
                    }
                } else {
                    // If no valid author ID, use the current user's ID
                    if (user && user.id && mongoose.Types.ObjectId.isValid(user.id)) {
                        authorId = new mongoose.Types.ObjectId(user.id);
                    } else {
                        // Last resort: create a new ID
                        authorId = new mongoose.Types.ObjectId();
                    }
                    
                    // Create a user record if needed
                    await User.findOneAndUpdate(
                        { _id: authorId },
                        { username: user?.username || `User-${authorId.toString().substring(0, 5)}` },
                        { upsert: true, new: true }
                    );
                }
                
                const newCommunityPost = new CommunityPost({
                    author: authorId, 
                    title, 
                    content, 
                    category, 
                    aiSummary
                });
                
                await newCommunityPost.save();
                
                // Format response
                const response = newCommunityPost.toObject();
                response.id = response._id.toString();
                
                // Get author data
                const authorData = await User.findById(authorId);
                response.author = {
                    id: authorId.toString(),
                    username: authorData?.username || 'Unknown User'
                };
                
                return response;
            } catch (error) {
                console.error('Error creating community post:', error);
                throw new Error('Failed to create community post: ' + error.message);
            }
        },
        createHelpRequest: async(_, {author, description, location, isResolved, volunteers}, {user, token}) => {
            if(!user) throw new Error('You are not authenticated');
            
            try {
                // Ensure author exists in local DB
                await syncUserData(author, token);
                
                let authorId;
                if (author && mongoose.Types.ObjectId.isValid(author)) {
                    authorId = new mongoose.Types.ObjectId(author);
                } else {
                    // If author is not a valid ObjectId, create a new one
                    authorId = new mongoose.Types.ObjectId();
                    
                    // Safely generate a username without relying on potentially null values
                    const username = user && user.username 
                        ? user.username 
                        : `User-${authorId.toString().substring(0, 5)}`;
                    
                    // And create a placeholder user
                    await User.create({
                        _id: authorId,
                        username: username
                    });
                }
                
                // Also ensure all volunteers exist
                const validVolunteers = [];
                if (volunteers && volunteers.length > 0) {
                    for (const volunteerId of volunteers) {
                        if (volunteerId) {
                            await syncUserData(volunteerId, token);
                            if (mongoose.Types.ObjectId.isValid(volunteerId)) {
                                validVolunteers.push(new mongoose.Types.ObjectId(volunteerId));
                            }
                        }
                    }
                }
                
                const newHelpRequest = new HelpRequest({
                    author: authorId, 
                    description, 
                    location, 
                    isResolved, 
                    volunteers: validVolunteers
                });
                
                await newHelpRequest.save();
                
                // Populate author and volunteers before returning
                await newHelpRequest.populate('author volunteers');
                
                return newHelpRequest;
            } catch (error) {
                console.error('Error creating help request:', error);
                throw new Error('Failed to create help request: ' + error.message);
            }
        },
        deleteCommunityPost: async(_, {id}, {user}) => {
            if(!user) throw new Error('You are not authenticated');
            const deletedCommunityPost = await CommunityPost.findByIdAndDelete(id);
            return deletedCommunityPost;
        },
        deleteHelpRequest: async(_, {id}, {user}) => {
            if(!user) throw new Error('You are not authenticated');
            const deletedHelpRequest = await HelpRequest.findByIdAndDelete(id);
            return deletedHelpRequest;
        },
        resolveHelpRequest: async(_, {id}, {user}) => {
            if(!user) throw new Error('You are not authenticated');
            await HelpRequest.findByIdAndUpdate(id, {isResolved: true});
            return true;
        },
        updateCommunityPost: async(_, {id, title, content, category, aiSummary}, {user}) => {
            if(!user) throw new Error('You are not authenticated');
            const updatedCommunityPost = await CommunityPost.findByIdAndUpdate(id, {title, content, category, aiSummary}, {new: true});
            return updatedCommunityPost;
        },
        updateHelpRequest: async(_, {id, description, location, isResolved, volunteers}, {user, token}) => {
            if(!user) throw new Error('You are not authenticated');
            
            // If updating volunteers, ensure they all exist
            const validVolunteers = [];
            if (volunteers && volunteers.length > 0) {
                for (const volunteerId of volunteers) {
                    if (volunteerId) {
                        await syncUserData(volunteerId, token);
                        if (mongoose.Types.ObjectId.isValid(volunteerId)) {
                            validVolunteers.push(new mongoose.Types.ObjectId(volunteerId));
                        }
                    }
                }
            }
            
            const updateData = {
                description, 
                location, 
                isResolved
            };
            
            if (validVolunteers.length > 0) {
                updateData.volunteers = validVolunteers;
            }
            
            const updatedHelpRequest = await HelpRequest.findByIdAndUpdate(id, updateData, {new: true});
            
            // Populate author and volunteers before returning
            await updatedHelpRequest.populate('author volunteers');
            
            return updatedHelpRequest;
        },
    },
}; 

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'https://studio.apollographql.com'],
    credentials: true,
}));
app.use(cookieParser());

// Create and start Apollo Server
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
        const token = req.cookies['token'];
        if (token) {
            try {
                const user = jwt.verify(token, 'your_secret_key'); // Replace with your actual secret key
                return { user, token };
            } catch (e) {
                throw new Error('Your session expired. Sign in again.');
            }
        }
    },
    plugins: [
        ApolloServerPluginLandingPageGraphQLPlayground(),
    ],
});

server.start().then(() => {
    server.applyMiddleware({ app, cors: false });
    app.listen({ port: 4002 }, () => console.log(`🚀 Server ready at http://localhost:4002${server.graphqlPath}`));
});