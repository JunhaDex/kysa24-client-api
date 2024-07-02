import request from 'supertest';

const baseUrl = 'http://localhost:3001';
const testUser1 = {
  id: 'new.minji',
  pwd: '000000',
  fcm: '',
  auth: '',
  myInfo: undefined,
};

const testUser2 = {
  id: 'park.jun',
  pwd: '000000',
  fcm: '',
  auth: '',
  myInfo: undefined,
};

const varbose = true;

describe('Server Readiness', () => {
  it('Health Check', async () => {
    return request(baseUrl).get('/api/v1/healthz').expect(200);
  });
});

describe('User on-boarding', () => {
  it('Landing without auth', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/group')
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.body.result.meta).not.toEqual(undefined); // paginated response
    expect(res.statusCode).toEqual(200);
    // TODO: fix this
    // expect(
    //   res.body.result.list.every((item: any) => item.isShow === 1),
    // ).toEqual(true);
  });
  it('Login', async () => {
    const res = await request(baseUrl)
      .post('/api/v1/auth/login')
      .send({
        id: testUser1.id,
        pwd: testUser1.pwd,
        fcm: testUser1.fcm,
      })
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    testUser1.auth = res.body.result.accessToken;
    expect(res.body.result.accessToken).not.toEqual(undefined);
    expect(res.statusCode).toEqual(200);
  });
  it('get my info', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/auth/my')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    testUser1.myInfo = res.body.result;
    expect(res.statusCode).toEqual(200);
  });
  it('View all users', async () => {
    // call /api/v1/user/secure-list without auth
    const res = await request(baseUrl)
      .get('/api/v1/user/secure-list')
      .set('Content-Type', 'application/json');
    // should fail with 403
    expect(res.statusCode).toEqual(403);
    // call /api/v1/user/secure-list with auth
    const res2 = await request(baseUrl)
      .get('/api/v1/user/secure-list')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res2.body, null, '\t'));
    }
    // testing here
    expect(res2.statusCode).toEqual(200);
  });
  it('View recent chats', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/chat/recent')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.body.result.meta).not.toEqual(undefined); // paginated response
    expect(res.statusCode).toEqual(200);
  });
  it('View notifications', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/user/my/noti')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.body.result.meta).not.toEqual(undefined); // paginated response
    expect(res.statusCode).toEqual(200);
  });
});

describe('Update user info', () => {
  it('update user info with profile upload', async () => {
    const uploadRes = await request(baseUrl)
      .post('/api/v1/upload/user/profile/new.minji')
      .attach('file', './test/assets/user-profile-smp.png')
      .set('Content-Type', 'multipart/form-data')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(uploadRes.body, null, '\t'));
    }
    // testing here
    expect(uploadRes.statusCode).toEqual(200);
    expect(uploadRes.body.result.location).toMatch(/^(http|https):\/\/[^ "]+$/);
    const patchRes = await request(baseUrl)
      .patch('/api/v1/user/my/' + testUser1.myInfo.ref)
      .send({
        profileImg: uploadRes.body.result.location,
        introduce:
          '저는 민지입니다! 2004년에 강원도 춘천에서 태어났어요. 2022년 7월 뉴진스로 데뷔했어요!',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(patchRes.body, null, '\t'));
    }
    // testing here
    expect(patchRes.statusCode).toEqual(200);
  });
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
