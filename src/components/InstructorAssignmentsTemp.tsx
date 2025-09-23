        <TabsContent value="submissions" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Student Submissions for Review</h2>
              <Badge className="bg-yellow-100 text-yellow-800">
                {studentSubmissions.filter(s => s.status === 'pending').length} Pending
              </Badge>
            </div>
            
            {studentSubmissions.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Student submissions will appear here when they complete assignments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Pending Submissions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Pending Reviews ({studentSubmissions.filter(s => s.status === 'pending').length})
                  </h3>
                  {studentSubmissions
                    .filter(submission => submission.status === 'pending')
                    .map((submission) => (
                      <Card key={submission.id} className="glass-card hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={submission.student_avatar} />
                              <AvatarFallback className="bg-calm-gradient text-white">
                                {submission.student_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-lg">{submission.student_name}</h4>
                                  <p className="text-muted-foreground">{submission.assignment_title}</p>
                                </div>
                                <div className="text-right">
                                  <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                                <p className="text-sm">{submission.content}</p>
                              </div>
                              
                              <div className="flex gap-3">
                                <Button size="sm" className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  Review Submission
                                </Button>
                                <Button size="sm" variant="outline" className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  Add Feedback
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                
                {/* Recently Reviewed */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Recently Reviewed ({studentSubmissions.filter(s => s.status === 'reviewed').length})
                  </h3>
                  {studentSubmissions
                    .filter(submission => submission.status === 'reviewed')
                    .slice(0, 3)
                    .map((submission) => (
                      <Card key={submission.id} className="glass-card">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={submission.student_avatar} />
                              <AvatarFallback className="bg-green-500 text-white">
                                {submission.student_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium">{submission.student_name}</h4>
                                  <p className="text-sm text-muted-foreground">{submission.assignment_title}</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <span className="font-semibold">{submission.score}/100</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Reviewed {new Date(submission.graded_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800">{submission.feedback}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>