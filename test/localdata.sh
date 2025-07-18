npx wrangler kv key put "story_overview:jcvv0n" '[{"storyId":"103429903","storyName":"三体"},{"storyId":"103422311","storyName":"第七感"},{"storyId":"103422772","storyName":"西游记"}]' --binding=NOV_KV --local

# npx wrangler kv key put "story_content:103429903" '[{"pageNo":1,"pageDesc":"第一章","content":["第一章测试内容1","第一章测试内容2","第一章测试内容3"]},{"pageNo":2,"pageDesc":"第二章","content":["第二章测试内容1","第二章测试内容2","第二章测试内容3"]},{"pageNo":3,"pageDesc":"第三章","content":["第三章测试内容1","第三章测试内容2","第三章测试内容3"]}]' --binding=NOV_KV --local

# r2 test data
cd test/
flatc -o testdata -b ../src/story.fbs localdata.json
npx wrangler r2 object put "r2-id/story_content:103429903" --file testdata/localdata.bin --local