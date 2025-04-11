import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Button, Form, Container, Alert, Spinner, Nav, Tab, Table, Modal } from 'react-bootstrap';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import './App.css';

const GET_COMMUNITY_POSTS = gql`
  query GetCommunityPosts {
    communityPosts {
      id
      author {
        id
        username
      }
      title
      content
      category
      aiSummary
      createdAt
      updateAt
    }
  }
`;

const GET_HELP_REQUESTS = gql`
  query GetHelpRequests {
    helpRequests {
      id
      author {
        id
        username
      }
      description
      location
      isResolved
      volunteers {
        id
        username
      }
      createdAt
      updateAt
    }
  }
`;

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      username
    }
  }
`;

const CREATE_COMMUNITY_POST = gql`
  mutation CreateCommunityPost($author: ID!, $title: String!, $content: String!, $category: String!, $aiSummary: String) {
    createCommunityPost(author: $author, title: $title, content: $content, category: $category, aiSummary: $aiSummary) {
      id
      title
    }
  }
`;

const UPDATE_COMMUNITY_POST = gql`
  mutation UpdateCommunityPost($id: ID!, $title: String, $content: String, $category: String, $aiSummary: String) {
    updateCommunityPost(id: $id, title: $title, content: $content, category: $category, aiSummary: $aiSummary) {
      id
      title
      content
      category
      aiSummary
    }
  }
`;

const DELETE_COMMUNITY_POST = gql`
  mutation DeleteCommunityPost($id: ID!) {
    deleteCommunityPost(id: $id) {
      id
    }
  }
`;

const CREATE_HELP_REQUEST = gql`
  mutation CreateHelpRequest($author: ID!, $description: String!, $location: String, $isResolved: Boolean, $volunteers: [ID!]) {
    createHelpRequest(author: $author, description: $description, location: $location, isResolved: $isResolved, volunteers: $volunteers) {
      id
      description
    }
  }
`;

const UPDATE_HELP_REQUEST = gql`
  mutation UpdateHelpRequest($id: ID!, $description: String, $location: String, $isResolved: Boolean, $volunteers: [ID!]) {
    updateHelpRequest(id: $id, description: $description, location: $location, isResolved: $isResolved, volunteers: $volunteers) {
      id
      description
      location
      isResolved
      volunteers {
        id
        username
      }
    }
  }
`;

const DELETE_HELP_REQUEST = gql`
  mutation DeleteHelpRequest($id: ID!) {
    deleteHelpRequest(id: $id) {
      id
    }
  }
`;

const SIGN_OUT_MUTATION = gql`
  mutation SignOut {
    signOut
  }
`;

function CommunityEngagementComponent({ currentUser }) {
  const { loading: loadingPosts, error: errorPosts, data: dataPosts } = useQuery(GET_COMMUNITY_POSTS, {
    context: { credentials: 'include' },
  });
  const { loading: loadingRequests, error: errorRequests, data: dataRequests } = useQuery(GET_HELP_REQUESTS, {
    context: { credentials: 'include' },
  });
  const { loading: loadingUsers, error: errorUsers, data: dataUsers } = useQuery(GET_USERS, {
    context: { credentials: 'include' },
  });

  const [createCommunityPost] = useMutation(CREATE_COMMUNITY_POST, {
    refetchQueries: [{ query: GET_COMMUNITY_POSTS }],
    onError: (error) => {
      console.error('Detailed error:', error);
    }
  });

  const [updateCommunityPost] = useMutation(UPDATE_COMMUNITY_POST, {
    refetchQueries: [{ query: GET_COMMUNITY_POSTS }],
    onError: (error) => {
      console.error('Error updating post:', error);
    }
  });

  const [deleteCommunityPost] = useMutation(DELETE_COMMUNITY_POST, {
    refetchQueries: [{ query: GET_COMMUNITY_POSTS }],
    onError: (error) => {
      console.error('Error deleting post:', error);
    }
  });

  const [createHelpRequest] = useMutation(CREATE_HELP_REQUEST, {
    refetchQueries: [{ query: GET_HELP_REQUESTS }],
  });

  const [updateHelpRequest] = useMutation(UPDATE_HELP_REQUEST, {
    refetchQueries: [{ query: GET_HELP_REQUESTS }],
    onError: (error) => {
      console.error('Error updating help request:', error);
    }
  });

  const [deleteHelpRequest] = useMutation(DELETE_HELP_REQUEST, {
    refetchQueries: [{ query: GET_HELP_REQUESTS }],
    onError: (error) => {
      console.error('Error deleting help request:', error);
    }
  });

  const authClient = new ApolloClient({
    uri: 'http://localhost:4001/graphql',
    cache: new InMemoryCache(),
    credentials: 'include'
  });

  // States for creating new content
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isResolved, setIsResolved] = useState(false);
  const [volunteers, setVolunteers] = useState([]);

  // States for editing content
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAiSummary, setEditAiSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIsResolved, setEditIsResolved] = useState(false);
  const [editVolunteers, setEditVolunteers] = useState([]);

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [deleteItemType, setDeleteItemType] = useState(null);

  const handleSignOut = () => {
    authClient.mutate({
      mutation: SIGN_OUT_MUTATION
    }).then(() => {
      window.location.href = '/';
    }).catch(error => {
      console.error('Sign out error:', error);
    });
  };

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date Error';
    }
  };

  // Helper to get author name safely
  const getAuthorName = (author) => {
    if (!author) return 'Unknown Author';
    if (typeof author === 'string') return author;
    return author.username || 'Unnamed User';
  };

  // Function to open edit modal for posts
  const handleEditPost = (post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
    setEditAiSummary(post.aiSummary || '');
    setShowEditPostModal(true);
  };

  // Function to open edit modal for help requests
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setEditDescription(request.description);
    setEditLocation(request.location || '');
    setEditIsResolved(request.isResolved);
    setEditVolunteers(request.volunteers?.map(v => v.id) || []);
    setShowEditRequestModal(true);
  };

  // Function to handle saving edited post
  const handleSaveEditedPost = async () => {
    try {
      await updateCommunityPost({
        variables: {
          id: editingPost.id,
          title: editTitle,
          content: editContent,
          category: editCategory,
          aiSummary: editAiSummary
        }
      });
      setShowEditPostModal(false);
    } catch (error) {
      console.error('Error saving edited post:', error);
    }
  };

  // Function to handle saving edited help request
  const handleSaveEditedRequest = async () => {
    try {
      await updateHelpRequest({
        variables: {
          id: editingRequest.id,
          description: editDescription,
          location: editLocation,
          isResolved: editIsResolved,
          volunteers: editVolunteers
        }
      });
      setShowEditRequestModal(false);
    } catch (error) {
      console.error('Error saving edited help request:', error);
    }
  };

  // Function to open delete confirmation modal
  const handleDeleteConfirmation = (id, type) => {
    setDeleteItemId(id);
    setDeleteItemType(type);
    setShowDeleteModal(true);
  };

  // Function to perform delete action
  const handleDelete = async () => {
    try {
      if (deleteItemType === 'post') {
        await deleteCommunityPost({
          variables: { id: deleteItemId }
        });
      } else if (deleteItemType === 'request') {
        await deleteHelpRequest({
          variables: { id: deleteItemId }
        });
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error(`Error deleting ${deleteItemType}:`, error);
    }
  };

  const handleCreateCommunityPost = async (e) => {
    e.preventDefault();
    try {
      if (!currentUser || !currentUser.id) {
        console.error("Cannot create post: No valid user ID");
        return;
      }
      
      await createCommunityPost({ 
        variables: { 
          author: currentUser.id, 
          title, 
          content, 
          category, 
          aiSummary 
        } 
      });
      setTitle('');
      setContent('');
      setCategory('');
      setAiSummary('');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCreateHelpRequest = async (e) => {
    e.preventDefault();
    try {
      if (!currentUser || !currentUser.id) {
        console.error("Cannot create help request: No valid user ID");
        return;
      }
      await createHelpRequest({ 
        variables: { 
          author: currentUser.id,
          description, 
          location, 
          isResolved, 
          volunteers 
        } 
      });
      setDescription('');
      setLocation('');
      setIsResolved(false);
      setVolunteers([]);
    } catch (error) {
      console.error('Error creating help request:', error);
    }
  };


  if (loadingPosts || loadingRequests || loadingUsers) return <Spinner animation="border" />;
  if (errorPosts || errorRequests || errorUsers) return <Alert variant="danger">{errorPosts?.message || errorRequests?.message || errorUsers?.message}</Alert>;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Community Engagement Portal</h1>
        <div>
          <Button variant="danger" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
      
      <Tab.Container defaultActiveKey="communityPosts">
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="communityPosts">Community Posts</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="helpRequests">Help Requests</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="createCommunityPost">Create Community Post</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="createHelpRequest">Create Help Request</Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content>
          <Tab.Pane eventKey="communityPosts">
            <h2>Community Posts</h2>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Content</th>
                  <th>Category</th>
                  <th>AI Summary</th>
                  <th>Author</th>
                  <th>Created At</th>
                  <th>Edit The Post</th>
                  <th>Delete The Post</th>
                </tr>
              </thead>
              <tbody>
                {dataPosts.communityPosts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>
                      <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                        {post.content}
                      </div>
                    </td>
                    <td>{post.category}</td>
                    <td>{post.aiSummary || 'N/A'}</td>
                    <td>{getAuthorName(post.author)}</td>
                    <td>{formatDate(post.createdAt)}</td>
                    <td>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleEditPost(post)}
                      >
                        Edit
                      </Button>
                      </td>
                    <td>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDeleteConfirmation(post.id, 'post')}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab.Pane>
          <Tab.Pane eventKey="helpRequests">
            <h2>Help Requests</h2>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Created At</th>
                  <th>Volunteers</th>
                  <th>Edit The Request</th>
                  <th>Delete The Request</th>
                </tr>
              </thead>
              <tbody>
                {dataRequests.helpRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                        {request.description}
                      </div>
                    </td>
                    <td>{request.location || 'Not specified'}</td>
                    <td>
                      <span className={request.isResolved ? 'text-success' : 'text-warning'}>
                        {request.isResolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td>{getAuthorName(request.author)}</td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td>
                      {request.volunteers && request.volunteers.length > 0 
                        ? request.volunteers.map(v => v.username).join(', ') 
                        : 'No volunteers'}
                    </td>
                    <td>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleEditRequest(request)}
                      >
                        Edit
                      </Button>
                      </td>
                    <td>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDeleteConfirmation(request.id, 'request')}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab.Pane>
          <Tab.Pane eventKey="createCommunityPost">
            <h2>Create Community Post</h2>
            <Form onSubmit={handleCreateCommunityPost}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Content</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={4}
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Control 
                  type="text" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>AI Summary (Optional)</Form.Label>
                <Form.Control 
                  type="text" 
                  value={aiSummary} 
                  onChange={(e) => setAiSummary(e.target.value)} 
                />
              </Form.Group>
              <Button type="submit" variant="primary">Create Post</Button>
            </Form>
          </Tab.Pane>
          <Tab.Pane eventKey="createHelpRequest">
            <h2>Create Help Request</h2>
            <Form onSubmit={handleCreateHelpRequest}>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={4}
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control 
                  type="text" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="checkbox" 
                  label="Is Resolved" 
                  checked={isResolved} 
                  onChange={(e) => setIsResolved(e.target.checked)} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Volunteers</Form.Label>
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ced4da', padding: '10px', borderRadius: '4px' }}>
                  {dataUsers?.users?.map((user) => (
                    <Form.Check
                      key={user.id}
                      type="checkbox"
                      label={user.username}
                      value={user.id}
                      checked={volunteers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVolunteers([...volunteers, user.id]);
                        } else {
                          setVolunteers(volunteers.filter((id) => id !== user.id));
                        }
                      }}
                    />
                  ))}
                </div>
              </Form.Group>
              <Button type="submit" variant="primary">Create Request</Button>
            </Form>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Edit Post Modal */}
      <Modal show={showEditPostModal} onHide={() => setShowEditPostModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Community Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={4}
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Control 
                type="text" 
                value={editCategory} 
                onChange={(e) => setEditCategory(e.target.value)} 
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>AI Summary (Optional)</Form.Label>
              <Form.Control 
                type="text" 
                value={editAiSummary} 
                onChange={(e) => setEditAiSummary(e.target.value)} 
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditPostModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEditedPost}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Help Request Modal */}
      <Modal show={showEditRequestModal} onHide={() => setShowEditRequestModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Help Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={4}
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control 
                type="text" 
                value={editLocation} 
                onChange={(e) => setEditLocation(e.target.value)} 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox" 
                label="Is Resolved" 
                checked={editIsResolved} 
                onChange={(e) => setEditIsResolved(e.target.checked)} 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Volunteers</Form.Label>
              <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ced4da', padding: '10px', borderRadius: '4px' }}>
                {dataUsers?.users?.map((user) => (
                  <Form.Check
                    key={user.id}
                    type="checkbox"
                    label={user.username}
                    value={user.id}
                    checked={editVolunteers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditVolunteers([...editVolunteers, user.id]);
                      } else {
                        setEditVolunteers(editVolunteers.filter((id) => id !== user.id));
                      }
                    }}
                  />
                ))}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditRequestModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEditedRequest}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this {deleteItemType}? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CommunityEngagementComponent;