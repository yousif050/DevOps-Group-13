import express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const app = express();

app.use(cors({
    origin: ['http://localhost:3000','http://localhost:3001',
    'http://localhost:3002','https://studio.apollographql.com'], // Adjust the origin according to your micro frontends' host
    credentials: true, // Allow cookies to be sent
  }));
app.use(cookieParser());

const mongoUri = 'mongodb://localhost:27017/user-auth-microservice';
mongoose.connect(mongoUri).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const typeDefs = gql`
    type User {
        id: ID!
        username: String!
        role: String!
    }

    type Query {
        currentUser: User
        users: [User]
    }

    type Mutation {
        login(username: String!, password: String!): Boolean
        register(username: String!, password: String!, email: String!, role: String!): Boolean
        signOut: Boolean
    }
`;

const resolvers = {
    Query: {
        currentUser: async (_, __, { req }) => {
            const token = req.cookies['token'];
            if (!token) {
                return null;
            }
            try {
                const decoded = jwt.verify(token, 'your_secret_key');
                const user = await User.findOne({ username: decoded.username });
                if (user) {
                    return {
                        id: user._id.toString(),
                        username: user.username,
                        role: user.role
                    };
                }
                return null;
            } catch (err) {
                return null;
            }
        },
        users: async (_, __, { req }) => {
            const token = req.cookies['token'];
            if (!token) {
                throw new Error('Not authenticated');
            }
            try {
                jwt.verify(token, 'your_secret_key');
                const users = await User.find({});
                return users.map(user => ({
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role
                }));
            } catch (err) {
                throw new Error('Not authenticated');
            }
        }
    },
    Mutation: {
        login: async (_, { username, password }, { res }) => {
            const user = await User.findOne({ username });
            if (!user) {
                throw new Error('User not found');
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                throw new Error('Wrong password');
            }

            const token = jwt.sign({ username }, 'your_secret_key', { expiresIn: '1d' });
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
            });
            return true;
        },
        register: async (_, { username, password, email, role }) => {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                throw new Error('User already exists');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ username, password: hashedPassword, email, role });
            await newUser.save();
            return true;
        },
        signOut: async (_, __, { res }) => {
            res.clearCookie('token');
            return true;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, res }) => ({ req, res }),
    plugins: [
        ApolloServerPluginLandingPageGraphQLPlayground(),
    ],
});

server.start().then(() => {
    server.applyMiddleware({
        app,
        cors: false
    });

    app.listen({ port: 4001 }, () =>
        console.log(`Server ready at http://localhost:4001${server.graphqlPath}`)
    );
});