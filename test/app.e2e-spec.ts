import request from 'supertest';

const baseUrl = 'http://localhost:3001';
const testUser1 = {
  id: 'new.minji',
  pwd: '000000',
  fcm: '',
  auth: '',
};

const testUser2 = {
  id: 'park.jun',
  pwd: '000000',
  fcm: '',
  auth: '',
};

describe('Server Readiness', () => {
  it('Health Check', () => {
    return request(baseUrl).get('/api/v1/healthz').expect(200);
  });
});

describe('User on-boarding', () => {
  it('Landing without auth', () => {
    request(baseUrl)
      .get('/api/v1/group')
      .set('Content-Type', 'application/json')
      .end((err, res) => {
        console.log(res.body);
        expect(res.statusCode).toBe(200);
      });
  });
  it('Login', () => {});
  it('Landing with auth', () => {});
  it('View all users', () => {});
  it('View recent chats', () => {}); //should be empty
  it('View chatroom with testUser2', () => {});
  it('View notifications', () => {}); //should be empty
});

describe('Update user info', () => {
  it('update profile image', () => {});
  it('update user profile', () => {});
});

// describe('Create and follow group', () => {
//   it('Create a new group', () => {});
//   it('View all groups', () => {});
//   it('View group feed', () => {});
//   it('Follow the group', () => {});
//   it('Unfollow the group', () => {});
//   it('Delete the group', () => {});
// });
//
// describe('Update group info', () => {
//   it('update group profile image', () => {});
//   it('update group profile', () => {});
// });
//
// describe('Create a new post and comment', () => {
//   it('Create a new post', () => {});
//   it('Comment on the post', () => {});
//   it('Like the post', () => {});
//   it('View the post detail', () => {});
//   it('Delete the post', () => {});
// });
//
// describe('Send a express ticket', () => {
//   it('Send a express ticket', () => {});
//   it('Check notification', () => {});
//   it('View chatroom with testUser2', () => {});
// });
