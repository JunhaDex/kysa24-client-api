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

// eslint-disable-next-line
var g_Ref = '36647485-e714-40e4-8e94-fd7e43721da9';

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
    const res2 = await request(baseUrl)
      .post('/api/v1/auth/login')
      .send({
        id: testUser2.id,
        pwd: testUser2.pwd,
      })
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    testUser1.auth = res.body.result.accessToken;
    testUser2.auth = res2.body.result.accessToken;
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
      console.log('Result: ', JSON.stringify(uploadRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(patchRes.body, null, '\t'));
    }
    // testing here
    expect(uploadRes.statusCode).toEqual(200);
    expect(uploadRes.body.result.location).toMatch(/^(http|https):\/\/[^ "]+$/);
    expect(patchRes.statusCode).toEqual(200);
  });
});

describe('Create and follow group', () => {
  // it('Create a new group', async () => {
  //   const g_title = 'Bunnies';
  //   const res = await request(baseUrl)
  //     .post('/api/v1/group/new')
  //     .send({
  //       groupName: g_title,
  //       introduce: 'Bunnies are cute!',
  //     })
  //     .set('Content-Type', 'application/json')
  //     .set('Authorization', `Bearer ${testUser1.auth}`);
  //   const listRes = await request(baseUrl)
  //     .get('/api/v1/group' + '?name=' + g_title)
  //     .set('Content-Type', 'application/json');
  //   // console log here
  //   if (varbose) {
  //     console.log('Result: ', JSON.stringify(res.body, null, '\t'));
  //     console.log('Result: ', JSON.stringify(listRes.body, null, '\t'));
  //   }
  //   // testing here
  //   g_Ref = listRes.body.result.list.filter(
  //     (item: any) => item.groupName === g_title,
  //   )[0]?.ref;
  //   expect(res.statusCode).toEqual(201);
  //   expect(listRes.statusCode).toEqual(200);
  //   expect(g_Ref).not.toEqual(undefined);
  // });
  it('View group feed', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/post/feed/' + g_Ref)
      .set('Content-Type', 'application/json');
    const postRes = await request(baseUrl)
      .post('/api/v1/post/new')
      .send({
        groupRef: g_Ref,
        message: 'Bunnies are cute!',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const res2 = await request(baseUrl)
      .get('/api/v1/post/feed/' + g_Ref)
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(postRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(res2.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(postRes.statusCode).toEqual(201);
    expect(res2.statusCode).toEqual(200);
    expect(res2.body.result.list.length).toBeGreaterThanOrEqual(1);
  });
  it('Follow the group', async () => {
    const followRes = await request(baseUrl)
      .put('/api/v1/group/follow/' + g_Ref)
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const unfollowResFail = await request(baseUrl)
      .put('/api/v1/group/follow/' + g_Ref + '?undo=true')
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const getRes = await request(baseUrl)
      .get('/api/v1/group/' + g_Ref)
      .set('Content-Type', 'application/json');
    const unfollowRes = await request(baseUrl)
      .put('/api/v1/group/follow/' + g_Ref + '?undo=true')
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(followRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(unfollowResFail.body, null, '\t'));
      console.log('Result: ', JSON.stringify(getRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(unfollowRes.body, null, '\t'));
    }
    // testing here
    expect(followRes.statusCode).toEqual(200);
    expect(unfollowResFail.statusCode).toEqual(403);
    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.result.followers).toEqual(2);
    expect(unfollowRes.statusCode).toEqual(200);
  });
  it('Delete the group', async () => {
    const g_title_tmp = 'Temp Group';
    await request(baseUrl)
      .post('/api/v1/group/new')
      .send({
        groupName: g_title_tmp,
        introduce: 'Temp Group for testing!',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const c_listRes = await request(baseUrl)
      .get('/api/v1/group' + '?name=' + g_title_tmp)
      .set('Content-Type', 'application/json');
    const g_Ref_tmp = c_listRes.body.result.list.filter(
      (item: any) => item.groupName === g_title_tmp,
    )[0]?.ref;
    expect(g_Ref_tmp).not.toEqual(undefined);
    /* INFO: change g_Ref_tmp to g_Ref to test complex delete */
    const lookAt = g_Ref_tmp;
    const res = await request(baseUrl)
      .delete('/api/v1/group/' + lookAt)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const listRes = await request(baseUrl)
      .get('/api/v1/post/feed/' + lookAt)
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(listRes.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(listRes.statusCode).toEqual(404);
  });
});

describe('Update group info', () => {
  it('update user info with profile upload', async () => {
    const uploadRes = await request(baseUrl)
      .post('/api/v1/upload/group/profile/Bunnies')
      .attach('file', './test/assets/group-profile-smp.jpg')
      .set('Content-Type', 'multipart/form-data')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const patchRes = await request(baseUrl)
      .patch('/api/v1/group/' + g_Ref)
      .send({
        introduce: 'Bunnies are so cute! (updated)',
        profileImg: uploadRes.body.result.location,
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(uploadRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(patchRes.body, null, '\t'));
    }
    // testing here
    expect(uploadRes.statusCode).toEqual(200);
    expect(uploadRes.body.result.location).toMatch(/^(http|https):\/\/[^ "]+$/);
    expect(patchRes.statusCode).toEqual(200);
  });
});

describe('Create a new post and comment', () => {
  let latestPost;
  it('Create a new post', async () => {
    const postRes = await request(baseUrl)
      .post('/api/v1/post/new')
      .send({
        groupRef: g_Ref,
        message: 'Who loves bunnies?',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const listRes = await request(baseUrl)
      .get('/api/v1/post/feed/' + g_Ref)
      .set('Content-Type', 'application/json');
    latestPost = listRes.body.result.list[0];
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(postRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(listRes.body, null, '\t'));
    }
    // testing here
    expect(postRes.statusCode).toEqual(201);
    expect(listRes.statusCode).toEqual(200);
    expect(listRes.body.result.list.length).toBeGreaterThanOrEqual(1);
  });
  it('Comment on the post', async () => {
    const cRes = await request(baseUrl)
      .post(`/api/v1/post/${latestPost.id}/reply/new`)
      .send({
        message: 'I do! ❤️',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // testing here
    expect(cRes.statusCode).toEqual(201);
  });
  it('Like the post', async () => {
    const u2Res = await request(baseUrl)
      .put(`/api/v1/post/like/${latestPost.id}`)
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const u1Res = await request(baseUrl)
      .put(`/api/v1/post/like/${latestPost.id}`)
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const u1cRes = await request(baseUrl)
      .put(`/api/v1/post/like/${latestPost.id}?undo=true`)
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(u2Res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(u1Res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(u1cRes.body, null, '\t'));
    }
    // testing here
    expect(u2Res.statusCode).toEqual(200);
    expect(u1Res.statusCode).toEqual(200);
    expect(u1cRes.statusCode).toEqual(200);
  });
  it('View the post detail', async () => {
    const res = await request(baseUrl)
      .get(`/api/v1/post/detail/${latestPost.id}`)
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(res.body.result.post.likes).toEqual(1);
    expect(res.body.result.comments.meta).not.toEqual(undefined);
    expect(res.body.result.comments.list.length).toEqual(
      res.body.result.post.comments,
    );
  });
  it('Delete the comment', async () => {
    const cRes = await request(baseUrl)
      .post(`/api/v1/post/${latestPost.id}/reply/new`)
      .send({
        message: 'I do! ❤️ 2',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const cListRes = await request(baseUrl)
      .get(`/api/v1/post/${latestPost.id}/reply`)
      .set('Content-Type', 'application/json');
    const latestComment = cListRes.body.result.list[0];
    const fRes = await request(baseUrl)
      .delete(`/api/v1/post/${latestPost.id}/reply/${latestComment.id}/delete`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const res = await request(baseUrl)
      .delete(`/api/v1/post/${latestPost.id}/reply/${latestComment.id}/delete`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const rRes = await request(baseUrl)
      .get(`/api/v1/post/detail/${latestPost.id}`)
      .set('Content-Type', 'application/json');
    const afterCount = rRes.body.result.post.comments;
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(cRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(cListRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(fRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(cRes.statusCode).toEqual(201);
    expect(cListRes.statusCode).toEqual(200);
    expect(fRes.statusCode).toEqual(403);
    expect(res.statusCode).toEqual(200);
    expect(cListRes.body.result.meta.totalCount).toEqual(afterCount + 1);
  });
  it('Delete the post', async () => {
    const fRes = await request(baseUrl)
      .delete(`/api/v1/post/${latestPost.id}/delete`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const res = await request(baseUrl)
      .delete(`/api/v1/post/${latestPost.id}/delete`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const sRes = await request(baseUrl)
      .get(`/api/v1/post/detail/${latestPost.id}`)
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(fRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(sRes.body, null, '\t'));
    }
    // testing here
    expect(fRes.statusCode).toEqual(403);
    expect(res.statusCode).toEqual(200);
    expect(sRes.statusCode).toEqual(404);
  });
});
//
// describe('Send a express ticket', () => {
//   it('Send a express ticket', () => {});
//   it('Check notification', () => {});
//   it('View chatroom with testUser2', () => {});
// });
