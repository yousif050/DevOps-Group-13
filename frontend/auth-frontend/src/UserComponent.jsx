import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Alert, Button, Form, Container, Spinner } from 'react-bootstrap';
import './App.css';

const LOGIN_MUTATION = gql`
mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password)
}
`;

const REGISTER_MUTATION = gql`
mutation Register($username: String!, $password: String!, $email: String!, $role: String!) {
    register(username: $username, password: $password, email: $email, role: $role)
}
`;

function UserComponent() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [activeTab, setActiveTab] = useState('login');
    const [authError, setAuthError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [login] = useMutation(LOGIN_MUTATION, {
        onCompleted: () => {
            window.dispatchEvent(new CustomEvent('loginSuccess', { detail: { isLoggedIn: true } }));
        },
        onError: (error) => setAuthError(error.message || 'Login failed'),
    });

    const [register] = useMutation(REGISTER_MUTATION, {
        onCompleted: () => {
            alert('Registration successful');
            setActiveTab('login');
        },
        onError: (error) => setAuthError(error.message || 'Registration failed'),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setAuthError('');

        if (!username || !password) {
            setAuthError('Username and password are required');
            setIsSubmitting(false);
            return;
        }

        if (activeTab === 'login') {
            await login({ variables: { username, password } });
        } else {
            if (!email || !role) {
                setAuthError('Email and role are required for registration');
                setIsSubmitting(false);
                return;
            }
            await register({ variables: { username, password, email, role } });
        }
        setIsSubmitting(false);
    }

    return (
        <Container className="p-5">
            <h3 className="text-center">Community Engagement Portal</h3>
            <Form onSubmit={handleSubmit} className='mt-3'>
                <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                </Form.Group>

                {activeTab === 'signup' && (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Role</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)} />
                        </Form.Group>
                    </>
                )}

                {authError && <Alert variant="danger">{authError}</Alert>}

                <Button variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : activeTab === 'login' ? 'Login' : 'Sign Up'}
                </Button>
            </Form>

            {activeTab === 'login' ? (
                <p className="mt-3">Not a member yet? <Button variant="link" onClick={() => setActiveTab('signup')}>Sign Up</Button></p>
            ) : (
                <p className="mt-3">Already a member? <Button variant="link" onClick={() => setActiveTab('login')}>Login</Button></p>
            )}
        </Container>
    )
}

export default UserComponent;