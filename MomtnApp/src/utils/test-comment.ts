import { supabase } from "@/integrations/supabase/client";

async function testCommentInsertion() {
  // First, sign in as a test user
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Replace with a test user email
    password: 'testpassword'   // Replace with the test user's password
  });

  if (signInError) {
    console.error('Error signing in:', signInError);
    return;
  }

  const user = signInData.user;
  console.log('Signed in as:', user?.email);

  // Test inserting a comment
  const testComment = {
    photo_id: 'some-photo-id', // Replace with an existing photo ID
    content: 'This is a test comment',
    user_id: user?.id
  };

  console.log('Attempting to insert comment:', testComment);

  const { data: commentData, error } = await supabase
    .from('comments')
    .insert(testComment)
    .select()
    .single();

  if (error) {
    console.error('Error inserting comment:', error);
    return;
  }

  console.log('Successfully inserted comment:', commentData);

  // Sign out after test
  await supabase.auth.signOut();
}

testCommentInsertion().catch(console.error);
