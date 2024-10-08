import request from 'supertest';

const baseUrl = 'http://127.0.0.1:3001';
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
var g_Ref = '8f01e814-21ff-4705-b6f5-6c2db72f8c2d';

describe('Server Readiness', () => {
  it('Health Check', async () => {
    return request(baseUrl).get('/api/v1/healthz').expect(200);
  });
  it('Get team list', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/team')
      .set('Content-Type', 'application/json');
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
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
    const res2 = await request(baseUrl)
      .get('/api/v1/auth/my')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    testUser1.myInfo = res.body.result;
    testUser2.myInfo = res2.body.result;
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
  });
  it('View all users', async () => {
    // call /api/v1/user/secure-list without auth
    const res = await request(baseUrl)
      .get('/api/v1/user/secure-list')
      .set('Content-Type', 'application/json');
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
    expect(res.statusCode).toEqual(403);
    expect(res2.statusCode).toEqual(200);
  });
  it('View user details', async () => {
    // call without auth should fail with 403
    const res = await request(baseUrl)
      .get('/api/v1/user/' + testUser2.myInfo.ref)
      .set('Content-Type', 'application/json');
    const resAuth = await request(baseUrl)
      .get('/api/v1/user/' + testUser2.myInfo.ref)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(resAuth.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(403);
    expect(resAuth.statusCode).toEqual(200);
    expect(
      ['user', 'extra']
        .map((k) => {
          return Object.keys(resAuth.body.result).includes(k);
        })
        .every((v) => v),
    ).toEqual(true);
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

describe('Personalized Data', () => {
  let recentGroup: any;
  it('Landing with auth', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/group')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    recentGroup = res.body.result.list[0];
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(
      res.body.result.list.every((item: any) => item.already !== undefined),
    ).toEqual(true);
  });
  it('Group with auth', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/group/' + recentGroup.ref)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(res.body.result.already).not.toEqual(undefined);
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
  it('update user extra info', async () => {
    const patchRes = await request(baseUrl)
      .patch('/api/v1/user/my/extra/' + testUser1.myInfo.ref)
      .send({
        movie: 'Interstellar',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const patchResFail = await request(baseUrl)
      .patch('/api/v1/user/my/extra/' + testUser1.myInfo.ref)
      .send({
        movie: 'Interstellar',
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(patchRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(patchResFail.body, null, '\t'));
    }
    // testing here
    expect(patchRes.statusCode).toEqual(200);
    expect(patchResFail.statusCode).toEqual(403);
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
  it('list followed groups', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/group/mylist')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(res.body.result.length).toBeGreaterThanOrEqual(1);
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
      .post('/api/v1/upload/group/cover/')
      .attach('file', './test/assets/hh.jpg')
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
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
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
    // personalized
    expect(
      listRes.body.result.list.every((item: any) => item.already !== undefined),
    ).toEqual(true);
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
    const u1rRes = await request(baseUrl)
      .get(`/api/v1/post/detail/${latestPost.id}`)
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
      console.log('Result: ', JSON.stringify(u1rRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(u1cRes.body, null, '\t'));
    }
    // testing here
    expect(u2Res.statusCode).toEqual(200);
    expect(u1Res.statusCode).toEqual(200);
    expect(u1rRes.statusCode).toEqual(200);
    expect(u1rRes.body.result.post.already).toEqual(true);
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
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
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
    // personalized
    expect(rRes.body.result.post.already).not.toEqual(undefined);
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
describe('Send a express ticket', () => {
  it('Open a new chatroom', async () => {
    const resSelf = await request(baseUrl)
      .get(`/api/v1/chat/user/${testUser1.myInfo.ref}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const res2 = await request(baseUrl)
      .get(`/api/v1/chat/user/${testUser2.myInfo.ref}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(resSelf.body, null, '\t'));
      console.log('Result: ', JSON.stringify(res2.body, null, '\t'));
    }
    // testing here
    expect(resSelf.statusCode).toEqual(400);
    expect(res2.statusCode).toEqual(200);
  });
  let ticketCount;
  let roomId;
  it('Check ticket count', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/chat/ticket/count')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    ticketCount = res.body.result.count;
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(res.body.result.count).toBeLessThanOrEqual(10);
  });
  it('Send a express ticket', async () => {
    const recipient = testUser2.myInfo.ref;
    const res = await request(baseUrl)
      .post('/api/v1/chat/ticket/' + recipient)
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    const chatListRes = await request(baseUrl)
      .get('/api/v1/chat/recent')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    roomId = chatListRes.body.result.list.pop().ref;
    const unreadRes = await request(baseUrl)
      .get('/api/v1/chat/unread')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const markRes = await request(baseUrl)
      .put('/api/v1/chat/read/' + roomId)
      .send({})
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(chatListRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(unreadRes.body, null, '\t'));
      console.log('Result: ', JSON.stringify(markRes.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(chatListRes.statusCode).toEqual(200);
    expect(unreadRes.statusCode).toEqual(200);
    expect(unreadRes.body.result.count).toEqual(1);
    expect(markRes.statusCode).toEqual(200);
  });
  it('Check ticket count after', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/chat/ticket/count')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser1.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(res.body.result.count).toEqual(ticketCount - 1);
  });
  it('View chatroom with testUser2', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/chat/history/' + roomId)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(res.body.result.meta).not.toEqual(undefined);
  });
  it('Check notification', async () => {
    const res = await request(baseUrl)
      .get('/api/v1/user/my/noti')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const delRes = await request(baseUrl)
      .delete('/api/v1/user/my/noti/delete-batch')
      .send({ ids: [res.body.result.list[0].id] })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(delRes.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(delRes.statusCode).toEqual(200);
  });
  it('Deny chat', async () => {
    const sender = testUser1.myInfo.ref;
    const res = await request(baseUrl)
      .post('/api/v1/chat/deny/' + sender)
      .send({
        status: true,
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    const unreadRes = await request(baseUrl)
      .get('/api/v1/chat/unread')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // rollback
    await request(baseUrl)
      .post('/api/v1/chat/deny/' + sender)
      .send({
        status: false,
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${testUser2.auth}`);
    // console log here
    if (varbose) {
      console.log('Result: ', JSON.stringify(res.body, null, '\t'));
      console.log('Result: ', JSON.stringify(unreadRes.body, null, '\t'));
    }
    // testing here
    expect(res.statusCode).toEqual(200);
    expect(unreadRes.statusCode).toEqual(200);
    expect(unreadRes.body.result.count).toEqual(0);
  });
});
