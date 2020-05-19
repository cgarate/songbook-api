import * as admin from 'firebase-admin';

const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

import { ApolloServer, ApolloError, ValidationError, gql } from 'apollo-server';

interface User {
  id: string;
  name: string;
  lastName: string;
  username: string;
  email: string;
}

interface Lyric {
  original: string;
  translation: string;
  transliteration: string;
}

interface Song {
  id: string;
  name: string;
  enteredBy: string;
  language: string;
  lyrics: [Lyric];
}

interface PlaylistItem {
  order: number;
  songId: string;
}

interface Playlist {
  id: string;
  name: string;
  createdBy: string;
  songs: [PlaylistItem]
}

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    lastName: String!
    username: String!
    email: String!
  }

  type Lyric {
    original: String
    translation: String
    transliteration: String
  }

  type Song {
    id: ID!
    name: String!
    language: String!
    enteredBy: String!
    lyrics: [Lyric]
  }

  type PlaylistItem {
    order: Int!
    songId: String!
  }

  type Playlist {
    id: ID!
    name: String
    createdBy: String
    songs: [PlaylistItem]
  }

  type Query {
    songs: [Song]
    users: [User]
    user(id: String!): User
    playlists: [Playlist]
    playlist(id: String!): Playlist
    song(id: String!): Song
    songsByUser(id: String!): [Song]
  }
`;

const resolvers = {
  Query: {
    async songs() {
      const songs = await admin
        .firestore()
        .collection('songs')
        .get();
      return songs.docs.map(song => song.data()) as Song[];
    },
    async user(_: null, args: { id: string }) {
      try {
        const userDoc = await admin
          .firestore()
          .doc(`users/${args.id}`)
          .get();
        const user = userDoc.data() as User | undefined;
        return user || new ValidationError('User ID not found');
      } catch (error) {
        throw new ApolloError(error);
      }
    },
    async playlist(_: null, args: { id: string }) {
      try {
        const playlistDoc = await admin
          .firestore()
          .doc(`playlists/${args.id}`)
          .get();
        const playlist = playlistDoc.data() as Playlist | undefined;
        return playlist || new ValidationError('Playlist ID not found');
      } catch (error) {
        throw new ApolloError(error);
      }
    },
    async playlists() {
      const playlists = await admin
        .firestore()
        .collection('playlists')
        .get();
      return playlists.docs.map(pl => pl.data()) as Playlist[];
    },
    async song(_: null, args: { id: string }) {
      try {
        const songDoc = await admin
          .firestore()
          .doc(`songs/${args.id}`)
          .get();
        const song = songDoc.data() as Song | undefined;
        return song || new ValidationError('Song ID not found');
      } catch (error) {
        throw new ApolloError(error);
      }
    },
    async songsByUser(_: null, user) {
      try {
        const songsEnteredByUser = await admin
          .firestore()
          .collection('songs')
          .where('enteredBy', '==', user.id)
          .get();
        return songsEnteredByUser.docs.map(song => song.data()) as Song[];
      } catch (error) {
        throw new ApolloError(error);
      }
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  engine: {
    apiKey: process.env.APOLLO_ENGINE_API_KEY
  },
  introspection: true
});

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
