import './App.css';
import UserComponent from './UserComponent';

import {ApolloClient, InMemoryCache, ApolloProvider} from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4001/graphql',
  cache: new InMemoryCache(),
  credentials: 'include'
});

function App(){
  return(
    <div className="App">
    <ApolloProvider client={client}>
        <UserComponent />
        </ApolloProvider>
      </div>
    
  );
}

export default App;
